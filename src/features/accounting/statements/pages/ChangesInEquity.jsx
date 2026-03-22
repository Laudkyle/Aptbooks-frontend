import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeStatementsApi } from '../api/statements.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Printer, Download, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

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

function MovementRow({ label, amount, level = 0, isExpanded, onToggle, hasChildren = false }) {
  const paddingLeft = level * 24;
  
  return (
    <div 
      className="flex items-center py-3 hover:bg-surface-2 transition-colors duration-150 px-2 md:px-4 border-b border-border-subtle last:border-0"
      style={{ paddingLeft: `${paddingLeft + 8}px` }}
    >
      {hasChildren && (
        <button 
          onClick={onToggle}
          className="mr-2 text-text-muted hover:text-text-strong flex-shrink-0"
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
      <span className="flex-1 text-sm text-text-muted break-words pr-2">
        {label}
      </span>
      <span className="text-sm text-text-strong whitespace-nowrap font-mono">
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function IntegrityIndicator({ integrity }) {
  if (!integrity) return null;
  
  const isWithinTolerance = integrity.within_tolerance;
  const difference = integrity.difference || 0;
  
  return (
    <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
      isWithinTolerance ? 'bg-green-50' : 'bg-red-50'
    }`}>
      {isWithinTolerance ? (
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <p className={`text-sm font-medium ${
          isWithinTolerance ? 'text-green-800' : 'text-red-800'
        }`}>
          {isWithinTolerance ? 'Statement Integrity Check Passed' : 'Statement Integrity Check Failed'}
        </p>
        <p className={`text-sm ${
          isWithinTolerance ? 'text-green-600' : 'text-red-600'
        }`}>
          {isWithinTolerance 
            ? `Difference: ${formatCurrency(difference)} (within tolerance)`
            : `Difference: ${formatCurrency(difference)} (outside tolerance)`
          }
        </p>
      </div>
    </div>
  );
}

function EquityStatementCard({ title, data, isCompare = false }) {
  if (!data) return null;
  
  const {
    from,
    to,
    opening_balance,
    net_income,
    movements = {},
    total_movements,
    computed_closing_balance,
    reported_closing_balance,
    integrity
  } = data;

  const [expandedSections, setExpandedSections] = useState(new Set(['movements']));
  
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Convert movements object to array for rendering
  const movementEntries = Object.entries(movements).map(([key, value]) => ({
    id: key,
    label: key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    amount: value
  }));

  return (
    <div className={`flex-1 ${isCompare ? 'border-l border-border-subtle pl-4 md:pl-6' : ''}`}>
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
          <p className="text-xs text-text-muted">From</p>
          <p className="text-sm font-medium text-text-strong">{formatDate(from)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">To</p>
          <p className="text-sm font-medium text-text-strong">{formatDate(to)}</p>
        </div>
      </div>

      {/* Equity Statement Table */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Opening Balance */}
          <MovementRow 
            label="Opening Balance"
            amount={opening_balance}
          />

          {/* Net Income */}
          <MovementRow 
            label="Net Income"
            amount={net_income}
          />

          {/* Movements Section */}
          {movementEntries.length > 0 && (
            <>
              <MovementRow 
                label="Other Movements"
                amount={total_movements}
                level={0}
                hasChildren={true}
                isExpanded={expandedSections.has('movements')}
                onToggle={() => toggleSection('movements')}
              />
              
              {expandedSections.has('movements') && movementEntries.map((movement) => (
                <MovementRow 
                  key={movement.id}
                  label={movement.label}
                  amount={movement.amount}
                  level={1}
                />
              ))}
            </>
          )}

          {/* Computed Closing Balance */}
          <div className="flex items-center py-4 mt-2 border-t-2 border-border-subtle /50 px-2 md:px-4">
            <span className="flex-1 text-sm font-semibold text-text-strong">
              Computed Closing Balance
            </span>
            <span className="text-sm font-semibold text-text-strong font-mono">
              {formatCurrency(computed_closing_balance)}
            </span>
          </div>

          {/* Reported Closing Balance */}
          <div className="flex items-center py-4 border-t border-border-subtle px-2 md:px-4">
            <span className="flex-1 text-sm font-medium text-text-body">
              Reported Closing Balance
            </span>
            <span className="text-sm font-medium text-text-strong font-mono">
              {formatCurrency(reported_closing_balance)}
            </span>
          </div>

          {/* Difference (if any) */}
          {computed_closing_balance !== reported_closing_balance && (
            <div className="flex items-center py-3 px-2 md:px-4 bg-yellow-50">
              <span className="flex-1 text-sm text-yellow-700">
                Difference
              </span>
              <span className="text-sm text-yellow-700 font-mono">
                {formatCurrency(computed_closing_balance - reported_closing_balance)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Integrity Indicator */}
      <IntegrityIndicator integrity={integrity} />
    </div>
  );
}

export default function ChangesInEquity() {
  const { http } = useApi();
  const api = useMemo(() => makeStatementsApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const [expandedSections] = useState(new Set(['movements']));
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
    queryKey: ['changesEquity', { periodId, comparePeriodId }],
    queryFn: () => api.changesInEquity({ periodId, comparePeriodId: comparePeriodId || '' }),
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
      <div className="bg-surface-1 rounded-lg shadow-xl">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-text-strong">Statement of Changes in Equity</h2>
              <p className="text-sm md:text-md text-text-muted mt-1">
                For the period ended {selectedDate}
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
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  leftIcon={Printer}
                  className="flex-1 md:flex-none"
                >
                  Print
                </Button>
                
                <Button
                  onClick={handleExport}
                  variant="outline"
                  leftIcon={Download}
                  className="flex-1 md:flex-none"
                >
                  Export
                </Button>
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
              <div className="text-sm text-text-muted">Loading statement of changes in equity...</div>
            </div>
          )}

          {q.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">
                {q.error?.message ?? 'Failed to load statement.'}
              </p>
            </div>
          )}

          {!periodId && !q.isLoading && (
            <div className="text-center py-12  rounded-lg">
              <p className="text-sm text-text-muted">
                Select a period to view the statement of changes in equity.
              </p>
            </div>
          )}

          {/* Statement Content */}
          {periodId && statementData && (
            <div className={`
              ${hasComparison ? 'grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8' : ''}
            `}>
              {/* Primary Period */}
              <EquityStatementCard 
                title="Current Period"
                data={statementData.data}
              />

              {/* Comparison Period */}
              {hasComparison && (
                <EquityStatementCard 
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