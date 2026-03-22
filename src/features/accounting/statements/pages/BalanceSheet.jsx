import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeStatementsApi } from '../api/statements.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../../shared/components/data/FilterBar.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Printer, Download, ChevronDown, ChevronRight } from 'lucide-react';

function formatCurrency(amount, currency = 'GHS') {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  
  
  return amount < 0 
    ? `-${currency} ${formattedAmount}`
    : `${currency} ${formattedAmount}`;
}

function StatementLine({ line, level = 0, isExpanded = true, onToggle }) {
  const hasChildren = line.children && line.children.length > 0;
  const isSection = line.line_type === 'section';
  const isFormula = line.line_type === 'formula';
  const isTotal = line.label.includes('Total') || line.label.includes('Check');
  
  const paddingLeft = level * 16; // 16px per level
  const showToggle = hasChildren && isSection;

  const getTextStyle = () => {
    if (isTotal) return 'font-semibold text-text-strong';
    if (isSection) return 'text-base md:text-lg font-semibold text-text-strong';
    return 'text-text-muted';
  };

  const getBgStyle = () => {
    if (isTotal) return 'border-t border-border-subtle';
    return '';
  };

  return (
    <>
      <div 
        className={`
          flex items-center py-2 hover:bg-surface-2 transition-colors duration-150 px-2 md:px-4
          ${getBgStyle()}
        `}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
      >
        {showToggle && (
          <button 
            onClick={() => onToggle?.(line.id)}
            className="mr-2 md:mr-3 text-text-muted hover:text-text-strong flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </button>
        )}
        {!showToggle && hasChildren && (
          <div className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
        )}
        <span className={`flex-1 break-words pr-2 text-sm md:text-base ${getTextStyle()}`}>
          {line.label}
        </span>
        <span className="text-text-strong whitespace-nowrap text-sm md:text-base">
          {formatCurrency(line.amount)}
        </span>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {line.children.map((child) => (
            <StatementLine 
              key={child.id}
              line={child}
              level={level + 1}
              isExpanded={isExpanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function BalanceSheet() {
  const { http } = useApi();
  const api = useMemo(() => makeStatementsApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const [expandedSections, setExpandedSections] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const periodsQ = useQuery({ 
    queryKey: ['periods'], 
    queryFn: periodsApi.list, 
    staleTime: 10_000 
  });
  
  const [periodId, setPeriodId] = useState('');
  const [comparePeriodId, setComparePeriodId] = useState('');

  const q = useQuery({
    queryKey: ['balanceSheet', { periodId, comparePeriodId }],
    queryFn: () => api.balanceSheet({ periodId, comparePeriodId: comparePeriodId || '' }),
    enabled: !!periodId
  });

  const periodOptions = [{ value: '', label: 'Select period…' }].concat(
    (periodsQ.data ?? []).map((p) => ({ value: p.id, label: p.code }))
  );

  const toggleSection = (lineId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  // Group lines by section for better organization
  const groupedLines = useMemo(() => {
    if (!q.data?.data?.lines) return {};
    
    const sections = {
      ASSETS: { label: 'Assets', lines: [], total: 0 },
      LIABILITIES: { label: 'Liabilities', lines: [], total: 0 },
      EQUITY: { label: 'Equity', lines: [], total: 0 }
    };

    q.data.data.lines.forEach(line => {
      if (line.section_code === 'ASSETS') {
        sections.ASSETS.lines.push(line);
        sections.ASSETS.total += line.amount;
      } else if (line.section_code === 'LIABILITIES') {
        sections.LIABILITIES.lines.push(line);
        sections.LIABILITIES.total += line.amount;
      } else if (line.section_code === 'EQUITY') {
        sections.EQUITY.lines.push(line);
        sections.EQUITY.total += line.amount;
      }
    });

    return sections;
  }, [q.data]);

  const totalAssets = groupedLines.ASSETS?.total || 0;
  const totalLiabilities = groupedLines.LIABILITIES?.total || 0;
  const totalEquity = groupedLines.EQUITY?.total || 0;
  const totalLiabilitiesEquity = totalLiabilities + totalEquity;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Implement export functionality (CSV, PDF, etc.)
    console.log('Export data', q.data);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6 lg:p-8 max-h-[calc(100vh-100px)] overflow-y-scroll">
      <div className="bg-surface-1 rounded-lg shadow-xl">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-text-strong">Balance Sheet</h2>
              <p className="text-sm md:text-md text-text-muted mt-1">
                As of {selectedDate}
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="date" 
                className="border border-border-subtle rounded-md px-3 py-2 text-sm text-text-body"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              
              <div className="flex gap-2 md:gap-4">
                <button
                  onClick={handlePrint}
                  className="flex-1 md:flex-none inline-flex items-center justify-center px-3 md:px-5 py-2 md:py-3 bg-surface-2 text-xs md:text-sm font-medium text-text-body border border-border-subtle rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Printer className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Print</span>
                </button>
                
                <button
                  onClick={handleExport}
                  className="flex-1 md:flex-none inline-flex items-center justify-center px-3 md:px-5 py-2 md:py-3 bg-surface-2 text-xs md:text-sm font-medium text-text-body border border-border-subtle rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* Period Selection */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              value={periodId} 
              onChange={(e) => setPeriodId(e.target.value)} 
              options={periodOptions} 
              placeholder="Select period"
            />
            <Select 
              value={comparePeriodId} 
              onChange={(e) => setComparePeriodId(e.target.value)} 
              options={[{ value:'', label:'No comparison' }, ...periodOptions.slice(1)]} 
              placeholder="Compare with"
            />
          </div>

          {/* Loading/Error States */}
          {q.isLoading && (
            <div className="text-center py-12">
              <div className="text-sm text-text-muted">Loading balance sheet...</div>
            </div>
          )}

          {q.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">
                {q.error?.message ?? 'Failed to load balance sheet.'}
              </p>
            </div>
          )}

          {!periodId && !q.isLoading && (
            <div className="text-center py-12  rounded-lg">
              <p className="text-sm text-text-muted">
                Select a period to view the balance sheet.
              </p>
            </div>
          )}

          {/* Balance Sheet Content */}
          {periodId && q.data?.data?.lines && (
            <div>
              {/* Assets Section */}
              <div className="mb-6 md:mb-10">
                <h3 className="text-lg md:text-xl font-semibold text-text-strong mb-3 md:mb-4 px-2 md:px-4">
                  Assets
                </h3>
                <div className="overflow-x-auto">
                  {groupedLines.ASSETS?.lines.map((line) => (
                    <StatementLine 
                      key={line.id}
                      line={line}
                      isExpanded={expandedSections.has(line.id)}
                      onToggle={toggleSection}
                    />
                  ))}
                  
                  {/* Total Assets */}
                  <div className="flex items-center py-3 mt-3 border-t border-border-subtle px-2 md:px-4">
                    <span className="flex-1 font-semibold text-text-strong text-sm md:text-base">
                      Total Assets
                    </span>
                    <span className="font-semibold text-text-strong text-sm md:text-base">
                      {formatCurrency(totalAssets)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border-subtle my-6 md:my-8"></div>

              {/* Liabilities & Equity Section */}
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-text-strong mb-3 md:mb-4 px-2 md:px-4">
                  Liabilities & Equity
                </h3>
                <div className="overflow-x-auto">
                  {/* Liabilities */}
                  {groupedLines.LIABILITIES?.lines.map((line) => (
                    <StatementLine 
                      key={line.id}
                      line={line}
                      isExpanded={expandedSections.has(line.id)}
                      onToggle={toggleSection}
                    />
                  ))}
                  
                  {/* Total Liabilities */}
                  <div className="flex items-center py-3 mt-3 border-t border-border-subtle px-2 md:px-4">
                    <span className="flex-1 font-semibold text-text-strong text-sm md:text-base">
                      Total Liabilities
                    </span>
                    <span className="font-semibold text-text-strong text-sm md:text-base">
                      {formatCurrency(totalLiabilities)}
                    </span>
                  </div>

                  {/* Equity */}
                  {groupedLines.EQUITY?.lines.map((line) => (
                    <StatementLine 
                      key={line.id}
                      line={line}
                      isExpanded={expandedSections.has(line.id)}
                      onToggle={toggleSection}
                    />
                  ))}

                  {/* Total Equity */}
                  <div className="flex items-center py-3 mt-3 border-t border-border-subtle px-2 md:px-4">
                    <span className="flex-1 font-semibold text-text-strong text-sm md:text-base">
                      Total Equity
                    </span>
                    <span className="font-semibold text-text-strong text-sm md:text-base">
                      {formatCurrency(totalEquity)}
                    </span>
                  </div>

                  {/* Total Liabilities & Equity */}
                  <div className="flex items-center py-4 mt-6 border-t-2 border-border-subtle px-2 md:px-4">
                    <span className="flex-1 text-base md:text-lg font-semibold text-text-strong">
                      Total Liabilities & Equity
                    </span>
                    <span className="text-base md:text-lg font-semibold text-text-strong">
                      {formatCurrency(totalLiabilitiesEquity)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}