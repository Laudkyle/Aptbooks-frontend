import React, { useEffect, useMemo, useState } from 'react';
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
    if (isTotal) return 'font-semibold text-gray-900';
    if (isSection) return 'text-base md:text-lg font-semibold text-gray-800';
    return 'text-gray-600';
  };

  const getBgStyle = () => {
    if (isTotal) return 'border-t border-gray-300';
    return '';
  };

  return (
    <>
      <div 
        className={`
          flex items-center py-2 hover:bg-slate-50 transition-colors duration-150 px-2 md:px-4
          ${getBgStyle()}
        `}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
      >
        {showToggle && (
          <button 
            onClick={() => onToggle?.(line.id)}
            className="mr-2 md:mr-3 text-gray-600 hover:text-gray-900 flex-shrink-0"
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
        <span className="text-gray-900 whitespace-nowrap text-sm md:text-base">
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

  const statementRoots = useMemo(() => {
    const roots = q.data?.data?.lines ?? [];
    return {
      assets: roots.find((line) => line.section_code === 'ASSETS') || null,
      liabilities: roots.find((line) => line.section_code === 'LIABILITIES') || null,
      equity: roots.find((line) => line.section_code === 'EQUITY') || null,
      check: roots.find((line) => line.section_code === 'CHECK') || null,
    };
  }, [q.data]);

  useEffect(() => {
    const allSectionIds = new Set();
    const walk = (line) => {
      if (!line) return;
      if (line.line_type === 'section' && Array.isArray(line.children) && line.children.length) {
        allSectionIds.add(line.id);
      }
      (line.children || []).forEach(walk);
    };
    walk(statementRoots.assets);
    walk(statementRoots.liabilities);
    walk(statementRoots.equity);
    setExpandedSections(allSectionIds);
  }, [statementRoots.assets, statementRoots.liabilities, statementRoots.equity]);

  const totalAssets = statementRoots.assets?.amount || 0;
  const totalLiabilities = statementRoots.liabilities?.amount || 0;
  const totalEquity = statementRoots.equity?.amount || 0;
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
      <div className="bg-white rounded-lg shadow-xl">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Balance Sheet</h2>
              <p className="text-sm md:text-md text-gray-600 mt-1">
                As of {selectedDate}
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="date" 
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              
              <div className="flex gap-2 md:gap-4">
                <button
                  onClick={handlePrint}
                  className="flex-1 md:flex-none inline-flex items-center justify-center px-3 md:px-5 py-2 md:py-3 bg-gray-100 text-xs md:text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Printer className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Print</span>
                </button>
                
                <button
                  onClick={handleExport}
                  className="flex-1 md:flex-none inline-flex items-center justify-center px-3 md:px-5 py-2 md:py-3 bg-gray-100 text-xs md:text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
              <div className="text-sm text-slate-600">Loading balance sheet...</div>
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
              <p className="text-sm text-slate-600">
                Select a period to view the balance sheet.
              </p>
            </div>
          )}

          {/* Balance Sheet Content */}
          {periodId && q.data?.data?.lines && (
            <div>
              {/* Assets Section */}
              <div className="mb-6 md:mb-10">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4 px-2 md:px-4">
                  Assets
                </h3>
                <div className="overflow-x-auto">
                  {(statementRoots.assets?.children || []).map((line) => (
                    <StatementLine 
                      key={line.id}
                      line={line}
                      isExpanded={expandedSections.has(line.id)}
                      onToggle={toggleSection}
                    />
                  ))}
                  
                  {/* Total Assets */}
                  <div className="flex items-center py-3 mt-3 border-t border-gray-300 px-2 md:px-4">
                    <span className="flex-1 font-semibold text-gray-900 text-sm md:text-base">
                      Total Assets
                    </span>
                    <span className="font-semibold text-gray-900 text-sm md:text-base">
                      {formatCurrency(totalAssets)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 my-6 md:my-8"></div>

              {/* Liabilities & Equity Section */}
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4 px-2 md:px-4">
                  Liabilities & Equity
                </h3>
                <div className="overflow-x-auto">
                  {/* Liabilities */}
                  {(statementRoots.liabilities?.children || []).map((line) => (
                    <StatementLine 
                      key={line.id}
                      line={line}
                      isExpanded={expandedSections.has(line.id)}
                      onToggle={toggleSection}
                    />
                  ))}
                  
                  {/* Total Liabilities */}
                  <div className="flex items-center py-3 mt-3 border-t border-gray-300 px-2 md:px-4">
                    <span className="flex-1 font-semibold text-gray-900 text-sm md:text-base">
                      Total Liabilities
                    </span>
                    <span className="font-semibold text-gray-900 text-sm md:text-base">
                      {formatCurrency(totalLiabilities)}
                    </span>
                  </div>

                  {/* Equity */}
                  {(statementRoots.equity?.children || []).map((line) => (
                    <StatementLine 
                      key={line.id}
                      line={line}
                      isExpanded={expandedSections.has(line.id)}
                      onToggle={toggleSection}
                    />
                  ))}

                  {/* Total Equity */}
                  <div className="flex items-center py-3 mt-3 border-t border-gray-300 px-2 md:px-4">
                    <span className="flex-1 font-semibold text-gray-900 text-sm md:text-base">
                      Total Equity
                    </span>
                    <span className="font-semibold text-gray-900 text-sm md:text-base">
                      {formatCurrency(totalEquity)}
                    </span>
                  </div>

                  {/* Total Liabilities & Equity */}
                  <div className="flex items-center py-4 mt-6 border-t-2 border-gray-300 px-2 md:px-4">
                    <span className="flex-1 text-base md:text-lg font-semibold text-gray-900">
                      Total Liabilities & Equity
                    </span>
                    <span className="text-base md:text-lg font-semibold text-gray-900">
                      {formatCurrency(totalLiabilitiesEquity)}
                    </span>
                  </div>

                  {statementRoots.check && (
                    <div className="flex items-center py-3 mt-3 border-t border-gray-300 px-2 md:px-4 text-sm md:text-base">
                      <span className="flex-1 font-medium text-gray-700">
                        {statementRoots.check.label}
                      </span>
                      <span className="font-medium text-gray-700">
                        {formatCurrency(statementRoots.check.amount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}