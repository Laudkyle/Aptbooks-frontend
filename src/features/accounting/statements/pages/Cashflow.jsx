import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeStatementsApi } from '../api/statements.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Printer, Download, ChevronDown, ChevronRight, ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';

function formatCurrency(amount, currency = 'GHS') {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  
  
  return amount < 0 
    ? `-${currency} ${formattedAmount}`
    : `${currency} ${formattedAmount}`;
}


function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getActivityIcon(activity) {
  switch (activity) {
    case 'operating':
      return <ArrowUpCircle className="w-4 h-4 text-green-600" />;
    case 'investing':
      return <ArrowDownCircle className="w-4 h-4 text-blue-600" />;
    case 'financing':
      return <MinusCircle className="w-4 h-4 text-purple-600" />;
    default:
      return null;
  }
}

function getActivityLabel(activity) {
  switch (activity) {
    case 'operating':
      return 'Operating Activities';
    case 'investing':
      return 'Investing Activities';
    case 'financing':
      return 'Financing Activities';
    default:
      return activity;
  }
}

function CashFlowLine({ line, level = 0, isExpanded = true, onToggle }) {
  const hasChildren = line.children && line.children.length > 0;
  const isTotal = line.label.includes('Total') || line.line_type === 'total';
  const isSection = line.line_type === 'section';
  
  const paddingLeft = level * 24;

  const getTextStyle = () => {
    if (isTotal) return 'font-semibold text-gray-900';
    if (isSection) return 'font-medium text-gray-800';
    return 'text-gray-600';
  };

  const getBgStyle = () => {
    if (isTotal) return 'border-t border-gray-300 /50';
    return '';
  };

  return (
    <>
      <div 
        className={`
          flex items-center py-2.5 hover:bg-slate-50 transition-colors duration-150 px-2 md:px-4
          ${getBgStyle()}
        `}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
      >
        {hasChildren && (
          <button 
            onClick={() => onToggle?.(line.id)}
            className="mr-2 text-gray-600 hover:text-gray-900 flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        {!hasChildren && level > 0 && (
          <div className="w-4 h-4 mr-2" />
        )}
        
        {line.activity && !hasChildren && (
          <span className="mr-2 flex-shrink-0">
            {getActivityIcon(line.activity)}
          </span>
        )}
        
        <span className={`flex-1 text-sm break-words pr-2 ${getTextStyle()}`}>
          {line.label}
        </span>
        
        <span className={`text-sm whitespace-nowrap font-mono ${
          line.amount < 0 ? 'text-red-600' : 'text-gray-900'
        }`}>
          {formatCurrency(line.amount)}
        </span>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {line.children.map((child) => (
            <CashFlowLine 
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

function ActivitySummary({ activity, total, lines = [], isExpanded, onToggle }) {
  if (!lines.length) return null;

  const activityLines = lines.filter(line => line.activity === activity);
  if (!activityLines.length) return null;

  return (
    <div className="mb-4">
      <div 
        className="flex items-center py-3 px-2 md:px-4 bg-gray-100/80 rounded-t-lg cursor-pointer hover:bg-gray-200/80 transition-colors"
        onClick={onToggle}
      >
        <button className="mr-2 text-gray-700">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
        <span className="flex-1 text-sm font-semibold text-gray-900">
          {getActivityLabel(activity)}
        </span>
        <span className={`text-sm font-semibold font-mono ${
          total < 0 ? 'text-red-600' : 'text-gray-900'
        }`}>
          {formatCurrency(total)}
        </span>
      </div>
      
      {isExpanded && (
        <div className="border border-gray-200 border-t-0 rounded-b-lg divide-y divide-gray-100">
          {activityLines.map((line) => (
            <CashFlowLine 
              key={line.id}
              line={line}
              level={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CashFlowStatementCard({ title, data, isCompare = false }) {
  if (!data) return null;
  
  const {
    from,
    to,
    lines = [],
    totals
  } = data;

  const [expandedActivities, setExpandedActivities] = useState(new Set(['operating', 'investing', 'financing']));
  
  const toggleActivity = (activity) => {
    setExpandedActivities(prev => {
      const next = new Set(prev);
      if (next.has(activity)) {
        next.delete(activity);
      } else {
        next.add(activity);
      }
      return next;
    });
  };

  const {
    operating = 0,
    investing = 0,
    financing = 0,
    net_change = 0
  } = totals || {};

  // Calculate opening and closing balances if available
  const openingBalance = lines.find(l => l.line_type === 'opening_balance')?.amount || 0;
  const closingBalance = lines.find(l => l.line_type === 'closing_balance')?.amount || 0;

  return (
    <div className={`flex-1 ${isCompare ? 'border-l border-gray-200 pl-4 md:pl-6' : ''}`}>
      {isCompare && (
        <div className="mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Comparison Period
          </span>
        </div>
      )}
      
      {/* Period Info */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4  rounded-lg">
        <div>
          <p className="text-xs text-gray-500">From</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(from)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">To</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(to)}</p>
        </div>
      </div>

      {/* Cash Flow Statement */}
      <div className="space-y-4">
        {/* Opening Balance (if available) */}
        {openingBalance !== 0 && (
          <div className="flex items-center py-2 px-2 md:px-4  rounded-lg">
            <span className="flex-1 text-sm text-gray-700">Opening Cash Balance</span>
            <span className="text-sm font-medium text-gray-900 font-mono">
              {formatCurrency(openingBalance)}
            </span>
          </div>
        )}

        {/* Operating Activities */}
        <ActivitySummary 
          activity="operating"
          total={operating}
          lines={lines}
          isExpanded={expandedActivities.has('operating')}
          onToggle={() => toggleActivity('operating')}
        />

        {/* Investing Activities */}
        <ActivitySummary 
          activity="investing"
          total={investing}
          lines={lines}
          isExpanded={expandedActivities.has('investing')}
          onToggle={() => toggleActivity('investing')}
        />

        {/* Financing Activities */}
        <ActivitySummary 
          activity="financing"
          total={financing}
          lines={lines}
          isExpanded={expandedActivities.has('financing')}
          onToggle={() => toggleActivity('financing')}
        />

        {/* Net Change */}
        <div className="flex items-center py-3 px-2 md:px-4 bg-gray-100 rounded-lg mt-4">
          <span className="flex-1 text-sm font-semibold text-gray-900">
            Net Change in Cash
          </span>
          <span className={`text-sm font-semibold font-mono ${
            net_change < 0 ? 'text-red-600' : 'text-gray-900'
          }`}>
            {formatCurrency(net_change)}
          </span>
        </div>

        {/* Closing Balance (if available) */}
        {closingBalance !== 0 && (
          <div className="flex items-center py-3 px-2 md:px-4 border-t-2 border-gray-300 mt-2">
            <span className="flex-1 text-sm font-semibold text-gray-900">
              Closing Cash Balance
            </span>
            <span className="text-sm font-semibold text-gray-900 font-mono">
              {formatCurrency(closingBalance)}
            </span>
          </div>
        )}
      </div>

      {/* Empty State */}
      {lines.length === 0 && (
        <div className="text-center py-8  rounded-lg">
          <p className="text-sm text-gray-500">
            No cash flow transactions for this period
          </p>
        </div>
      )}
    </div>
  );
}

export default function Cashflow() {
  const { http } = useApi();
  const api = useMemo(() => makeStatementsApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

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
    queryKey: ['cashFlow', { periodId, comparePeriodId }],
    queryFn: () => api.cashFlow({ periodId, comparePeriodId: comparePeriodId || '' }),
    enabled: !!periodId
  });

  const periodOptions = [{ value: '', label: 'Select period…' }].concat(
    (periodsQ.data ?? []).map((p) => ({ value: p.id, label: p.code }))
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Implement export functionality (CSV, PDF, etc.)
    console.log('Export data', q.data);
  };

  const statementData = q.data?.data;
  const hasComparison = !!statementData?.compare;

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6 lg:p-8 max-h-[calc(100vh-100px)] overflow-y-scroll">
      <div className="bg-white rounded-lg shadow-xl">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Cash Flow Statement</h2>
              <p className="text-sm md:text-md text-gray-600 mt-1">
                For the period ended {selectedDate}
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
              <div className="text-sm text-slate-600">Loading cash flow statement...</div>
            </div>
          )}

          {q.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">
                {q.error?.message ?? 'Failed to load cash flow statement.'}
              </p>
            </div>
          )}

          {!periodId && !q.isLoading && (
            <div className="text-center py-12  rounded-lg">
              <p className="text-sm text-slate-600">
                Select a period to view the cash flow statement.
              </p>
            </div>
          )}

          {/* Statement Content */}
          {periodId && statementData && (
            <div className={`
              ${hasComparison ? 'grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8' : ''}
            `}>
              {/* Primary Period */}
              <CashFlowStatementCard 
                title="Current Period"
                data={statementData.data}
              />

              {/* Comparison Period */}
              {hasComparison && (
                <CashFlowStatementCard 
                  title="Comparison Period"
                  data={statementData.compare}
                  isCompare={true}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}