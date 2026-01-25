import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeStatementsApi } from '../api/statements.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { formatMoney } from '../../../../shared/utils/formatMoney.js';
import { formatDate } from '../../../../shared/utils/formatDate.js';
import { TrendingUp, TrendingDown, Download, Printer, Calendar, FileText, ChevronDown, ChevronRight } from 'lucide-react';

export default function PnL() {
  const { http } = useApi();
  const api = useMemo(() => makeStatementsApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  
  const periodsQ = useQuery({ 
    queryKey: ['periods'], 
    queryFn: periodsApi.list, 
    staleTime: 10_000 
  });
  
  const [periodId, setPeriodId] = useState('');
  const [comparePeriodId, setComparePeriodId] = useState('');
  const [mode, setMode] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set());
  
  const q = useQuery({
    queryKey: ['pnl', { periodId, comparePeriodId, mode }],
    queryFn: () => api.incomeStatement({ 
      periodId, 
      comparePeriodId: comparePeriodId || undefined, 
      mode: mode || undefined 
    }),
    enabled: !!periodId
  });
  
  const periodOptions = [
    { value: '', label: 'Select period…' }
  ].concat((periodsQ.data ?? []).map((p) => ({ 
    value: p.id, 
    label: `${p.code}${p.name ? ` - ${p.name}` : ''}` 
  })));

  const selectedPeriod = periodsQ.data?.find(p => p.id === periodId);
  const comparePeriod = periodsQ.data?.find(p => p.id === comparePeriodId);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Calculate totals and subtotals
  const calculateSectionTotal = (section) => {
    return section.children?.reduce((sum, child) => sum + (parseFloat(child.amount) || 0), 0) || 0;
  };

  const getCompareAmount = (lineId, compareLines) => {
    const findLine = (lines, id) => {
      for (const line of lines) {
        if (line.id === id) return line;
        if (line.children) {
          const found = findLine(line.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    const compareLine = findLine(compareLines || [], lineId);
    return parseFloat(compareLine?.amount) || 0;
  };

  // Render a single line with proper styling
  const renderLine = (line, level = 0, compareLines = null, parentId = '') => {
    const isSection = line.line_type === 'section';
    const isFormula = line.line_type === 'formula';
    const isAccount = line.line_type === 'account';
    const hasChildren = line.children && line.children.length > 0;
    
    const sectionKey = `${parentId}-${line.id}`;
    const isExpanded = expandedSections.has(sectionKey) || level === 0;
    
    const amount = parseFloat(line.amount) || 0;
    const compareAmount = compareLines ? getCompareAmount(line.id, compareLines) : 0;
    const variance = compareLines ? amount - compareAmount : 0;
    const variancePercent = compareLines && compareAmount !== 0 
      ? ((variance / Math.abs(compareAmount)) * 100) 
      : 0;

    // Section totals for sections with children
    const sectionTotal = isSection ? calculateSectionTotal(line) : amount;
    const compareSectionTotal = isSection && compareLines 
      ? line.children?.reduce((sum, child) => sum + getCompareAmount(child.id, compareLines), 0) || 0
      : compareAmount;
    const sectionVariance = isSection ? sectionTotal - compareSectionTotal : variance;
    const sectionVariancePercent = isSection && compareSectionTotal !== 0
      ? ((sectionVariance / Math.abs(compareSectionTotal)) * 100)
      : variancePercent;

    return (
      <React.Fragment key={line.id}>
        <tr className={`
          ${isSection ? 'bg-slate-100 hover:bg-slate-200 font-semibold border-t-2 border-slate-300' : ''}
          ${isFormula ? 'bg-slate-800 text-white font-bold border-t-4 border-slate-900' : ''}
          ${isAccount ? 'hover:bg-slate-50' : ''}
          transition-colors
        `}>
          <td className={`py-3 px-4 ${isFormula ? 'text-white' : ''}`} style={{ paddingLeft: `${level * 32 + 16}px` }}>
            <div className="flex items-center gap-2">
              {isSection && hasChildren && (
                <button 
                  onClick={() => toggleSection(sectionKey)}
                  className="text-slate-600 hover:text-slate-900"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              )}
              <div className={`text-sm ${isSection ? 'font-semibold text-slate-900 uppercase tracking-wide' : isFormula ? 'font-bold text-white uppercase' : 'text-slate-700'}`}>
                {line.label}
              </div>
            </div>
            {line.section_code && !isFormula && (
              <div className="text-xs text-slate-500 ml-6">{line.section_code}</div>
            )}
          </td>
          
          <td className={`py-3 px-4 text-right ${isFormula ? 'text-white' : ''}`}>
            {(isSection || isFormula) && (
              <div className={`text-sm font-bold ${isFormula ? 'text-xl text-white' : 'text-slate-900'}`}>
                {formatMoney(isSection ? sectionTotal : amount, 'GHS')}
              </div>
            )}
            {isAccount && (
              <div className="text-sm text-slate-700">
                {formatMoney(amount, 'GHS')}
              </div>
            )}
          </td>
          
          {compareLines && (
            <>
              <td className={`py-3 px-4 text-right ${isFormula ? 'text-white' : ''}`}>
                {(isSection || isFormula) && (
                  <div className={`text-sm font-bold ${isFormula ? 'text-xl text-white' : 'text-slate-900'}`}>
                    {formatMoney(isSection ? compareSectionTotal : compareAmount, 'GHS')}
                  </div>
                )}
                {isAccount && (
                  <div className="text-sm text-slate-700">
                    {formatMoney(compareAmount, 'GHS')}
                  </div>
                )}
              </td>
              
              <td className={`py-3 px-4 text-right ${isFormula ? 'text-white' : ''}`}>
                <div className={`text-sm font-bold ${
                  isFormula 
                    ? 'text-white' 
                    : (isSection ? sectionVariance : variance) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                }`}>
                  {(isSection ? sectionVariance : variance) >= 0 ? '+' : ''}
                  {formatMoney(isSection ? sectionVariance : variance, 'GHS')}
                </div>
              </td>
              
              <td className={`py-3 px-4 text-right ${isFormula ? 'text-white' : ''}`}>
                {((isSection && compareSectionTotal !== 0) || (isFormula && compareAmount !== 0) || (isAccount && compareAmount !== 0)) && (
                  <div className="flex items-center justify-end gap-1">
                    {!isFormula && (
                      (isSection ? sectionVariance : variance) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )
                    )}
                    <span className={`text-sm font-bold ${
                      isFormula 
                        ? 'text-white' 
                        : (isSection ? sectionVariance : variance) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                    }`}>
                      {Math.abs(isSection ? sectionVariancePercent : variancePercent).toFixed(1)}%
                    </span>
                  </div>
                )}
              </td>
            </>
          )}
        </tr>
        
        {/* Render children if section is expanded */}
        {isSection && hasChildren && isExpanded && 
          line.children.map(child => renderLine(child, level + 1, compareLines, sectionKey))
        }
      </React.Fragment>
    );
  };

  const statementData = q.data?.data;
  const lines = statementData?.lines || [];
  const compareLines = statementData?.compare?.lines;
  const hasComparison = !!compareLines;

  // Calculate key metrics
  const revenue = lines.find(l => l.section_code === 'REV');
  const cogs = lines.find(l => l.section_code === 'COGS');
  const opex = lines.find(l => l.section_code === 'OPEX');
  const netIncome = lines.find(l => l.section_code === 'NET_INCOME');

  const revenueAmount = calculateSectionTotal(revenue || {});
  const cogsAmount = calculateSectionTotal(cogs || {});
  const opexAmount = calculateSectionTotal(opex || {});
  const grossProfit = revenueAmount - cogsAmount;
  const grossMargin = revenueAmount !== 0 ? (grossProfit / revenueAmount) * 100 : 0;
  const netIncomeAmount = parseFloat(netIncome?.amount) || 0;
  const netMargin = revenueAmount !== 0 ? (netIncomeAmount / revenueAmount) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8" />
                <div>
                  <h1 className="text-3xl font-bold">Income Statement</h1>
                  <p className="text-slate-300 mt-1">Profit & Loss Report</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Report Parameters</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Period *
                  </label>
                  <Select 
                    value={periodId} 
                    onChange={(e) => setPeriodId(e.target.value)} 
                    options={periodOptions}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Compare With Period
                  </label>
                  <Select 
                    value={comparePeriodId} 
                    onChange={(e) => setComparePeriodId(e.target.value)} 
                    options={[
                      { value: '', label: 'No comparison' }, 
                      ...periodOptions.slice(1)
                    ]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Display Mode
                  </label>
                  <Input 
                    placeholder="e.g., detailed, summary" 
                    value={mode} 
                    onChange={(e) => setMode(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          {periodId && !q.isLoading && !q.isError && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Total Revenue</div>
                <div className="text-2xl font-bold text-slate-900">{formatMoney(revenueAmount, 'GHS')}</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Gross Profit</div>
                <div className="text-2xl font-bold text-slate-900">{formatMoney(grossProfit, 'GHS')}</div>
                <div className="text-xs text-slate-600 mt-1">Margin: {grossMargin.toFixed(1)}%</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Operating Expenses</div>
                <div className="text-2xl font-bold text-red-600">{formatMoney(opexAmount, 'GHS')}</div>
              </div>
              
              <div className={`bg-white rounded-lg shadow-sm border-2 p-6 ${netIncomeAmount >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Net Income</div>
                <div className={`text-2xl font-bold ${netIncomeAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(netIncomeAmount, 'GHS')}
                </div>
                <div className="text-xs text-slate-600 mt-1">Margin: {netMargin.toFixed(1)}%</div>
              </div>
            </div>
          )}

          {/* Statement Content */}
          {!periodId ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-12 text-center">
                <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Select a Period</h3>
                <p className="text-sm text-slate-600">Choose a period above to generate the income statement</p>
              </div>
            </div>
          ) : q.isLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-12 text-center">
                <div className="text-slate-600">Loading statement...</div>
              </div>
            </div>
          ) : q.isError ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-12 text-center">
                <div className="text-red-600">{q.error?.message ?? 'Failed to load statement.'}</div>
              </div>
            </div>
          ) : (
            <>
              {/* Statement Table */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 text-center border-b border-slate-200 bg-slate-50">
                  <h2 className="text-xl font-bold text-slate-900">Income Statement</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedPeriod?.name || selectedPeriod?.code}
                  </p>
                  {selectedPeriod?.start_date && selectedPeriod?.end_date && (
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(selectedPeriod.start_date, 'MMM DD, YYYY')} - {formatDate(selectedPeriod.end_date, 'MMM DD, YYYY')}
                    </p>
                  )}
                  {hasComparison && comparePeriod && (
                    <p className="text-xs text-slate-500 mt-2">
                      Compared with: {comparePeriod.name || comparePeriod.code}
                    </p>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b-2 border-slate-300">
                      <tr>
                        <th className="py-4 px-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="py-4 px-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider w-40">
                          {selectedPeriod?.code || 'Current'}
                        </th>
                        {hasComparison && (
                          <>
                            <th className="py-4 px-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider w-40">
                              {comparePeriod?.code || 'Previous'}
                            </th>
                            <th className="py-4 px-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider w-36">
                              Variance
                            </th>
                            <th className="py-4 px-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider w-24">
                              Change %
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.length > 0 ? (
                        lines.map(line => renderLine(line, 0, compareLines))
                      ) : (
                        <tr>
                          <td colSpan={hasComparison ? 5 : 2} className="py-12 text-center text-slate-500">
                            No data available for this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Debug Info */}
              <details className="bg-white rounded-lg shadow-sm border border-slate-200">
                <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-slate-700 hover:bg-slate-50">
                  View Raw Data (Debug)
                </summary>
                <div className="p-6 border-t border-slate-200">
                  <pre className="max-h-96 overflow-auto rounded bg-slate-50 p-4 text-xs text-slate-800 font-mono">
                    {JSON.stringify(statementData, null, 2)}
                  </pre>
                </div>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  );
}