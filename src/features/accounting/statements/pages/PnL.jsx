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

  // Calculate section total from children
  const calculateSectionTotal = (section) => {
    if (!section.children || section.children.length === 0) {
      return parseFloat(section.amount) || 0;
    }
    return section.children.reduce((sum, child) => sum + (parseFloat(child.amount) || 0), 0);
  };

  // Find section by section_code
  const findSectionByCode = (lines, sectionCode) => {
    for (const line of lines) {
      if (line.section_code === sectionCode) {
        return line;
      }
      if (line.children) {
        const found = findSectionByCode(line.children, sectionCode);
        if (found) return found;
      }
    }
    return null;
  };

  // Find line in compare data
  const getCompareLine = (lineId, compareLines) => {
    const findLineRecursive = (lines, id) => {
      for (const line of lines) {
        if (line.id === id) return line;
        if (line.children && line.children.length > 0) {
          const found = findLineRecursive(line.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    return findLineRecursive(compareLines || [], lineId);
  };

  // Get compare amount for a line
  const getCompareAmount = (line, compareLines) => {
    const compareLine = getCompareLine(line.id, compareLines);
    if (compareLine) {
      if (compareLine.line_type === 'section') {
        return calculateSectionTotal(compareLine);
      }
      return parseFloat(compareLine.amount) || 0;
    }
    return 0;
  };

  // Render a single line with proper styling
  const renderLine = (line, level = 0, compareLines = null, parentId = '') => {
    const isSection = line.line_type === 'section';
    const isFormula = line.line_type === 'formula';
    const isAccount = line.line_type === 'account';
    const hasChildren = line.children && line.children.length > 0;
    
    const sectionKey = `${parentId}-${line.id}`;
    const isExpanded = expandedSections.has(sectionKey);
    
    // Calculate amounts based on line type
    let amount = 0;
    if (isSection) {
      amount = calculateSectionTotal(line);
    } else {
      amount = parseFloat(line.amount) || 0;
    }
    
    const compareAmount = compareLines ? getCompareAmount(line, compareLines) : 0;
    const variance = compareLines ? amount - compareAmount : 0;
    const variancePercent = compareLines && compareAmount !== 0 
      ? ((variance / Math.abs(compareAmount)) * 100) 
      : 0;

    // Special styling for Other section
    const isOtherSection = line.section_code === 'OTHER';
    const isOtherIncome = line.section_code === 'OTHER_INCOME';
    const isOtherExpense = line.section_code === 'OTHER_EXP';

    return (
      <React.Fragment key={line.id}>
        <tr className={`
          ${isFormula ? 'bg-slate-800 text-white font-bold border-t-4 border-slate-900' : ''}
          ${isSection && !isOtherSection ? 'bg-slate-100 hover:bg-slate-200 font-semibold border-t-2 border-slate-300' : ''}
          ${isOtherSection ? 'bg-blue-50 hover:bg-blue-100 font-semibold border-t-2 border-blue-300' : ''}
          ${isAccount ? 'hover:bg-slate-50' : ''}
          ${isOtherIncome ? 'text-green-700 hover:bg-green-50' : ''}
          ${isOtherExpense ? 'text-red-700 hover:bg-red-50' : ''}
          transition-colors
        `}>
          <td className={`py-3 px-4 ${isFormula ? 'text-white' : ''}`} style={{ paddingLeft: `${level * 32 + 16}px` }}>
            <div className="flex items-center gap-2">
              {isSection && hasChildren && !isFormula && (
                <button 
                  onClick={() => toggleSection(sectionKey)}
                  className={`${isOtherSection ? 'text-blue-600 hover:text-blue-900' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              )}
              <div className={`text-sm 
                ${isSection ? 'font-semibold uppercase tracking-wide' : ''}
                ${isOtherSection ? 'text-blue-900' : isFormula ? 'font-bold text-white uppercase' : 'text-slate-700'}
                ${isOtherIncome ? 'text-green-900' : ''}
                ${isOtherExpense ? 'text-red-900' : ''}
              `}>
                {line.label}
              </div>
            </div>
            {line.section_code && !isFormula && (
              <div className={`text-xs ml-6 ${isOtherSection ? 'text-blue-600' : 'text-slate-500'}`}>
                {line.section_code}
              </div>
            )}
          </td>
          
          <td className={`py-3 px-4 text-right ${isFormula ? 'text-white' : ''}`}>
            <div className={`
              ${isFormula ? 'text-xl' : 'text-sm'}
              ${isSection || isFormula ? 'font-bold' : ''}
              ${isOtherIncome ? 'text-green-600 font-medium' : ''}
              ${isOtherExpense ? 'text-red-600 font-medium' : ''}
              ${!isOtherIncome && !isOtherExpense && !isFormula ? 'text-slate-700' : ''}
            `}>
              {formatMoney(amount, 'GHS')}
            </div>
          </td>
          
          {compareLines && (
            <>
              <td className={`py-3 px-4 text-right ${isFormula ? 'text-white' : ''}`}>
                <div className={`
                  ${isFormula ? 'text-xl' : 'text-sm'}
                  ${isSection || isFormula ? 'font-bold' : ''}
                  ${isOtherIncome ? 'text-green-600 font-medium' : ''}
                  ${isOtherExpense ? 'text-red-600 font-medium' : ''}
                  ${!isOtherIncome && !isOtherExpense && !isFormula ? 'text-slate-700' : ''}
                `}>
                  {formatMoney(compareAmount, 'GHS')}
                </div>
              </td>
              
              <td className={`py-3 px-4 text-right ${isFormula ? 'text-white' : ''}`}>
                <div className={`text-sm font-bold ${
                  isFormula 
                    ? 'text-white' 
                    : variance >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                }`}>
                  {variance >= 0 ? '+' : ''}
                  {formatMoney(variance, 'GHS')}
                </div>
              </td>
              
              <td className={`py-3 px-4 text-right ${isFormula ? 'text-white' : ''}`}>
                {compareAmount !== 0 && (
                  <div className="flex items-center justify-end gap-1">
                    {!isFormula && (
                      variance >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )
                    )}
                    <span className={`text-sm font-bold ${
                      isFormula 
                        ? 'text-white' 
                        : variance >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                    }`}>
                      {Math.abs(variancePercent).toFixed(1)}%
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

  const statementData = q.data?.data || q.data;
  const lines = statementData?.lines || [];
  const compareLines = statementData?.compare?.lines;
  const hasComparison = !!compareLines && comparePeriodId;

  // Calculate key metrics based on the data structure
  const revenueSection = findSectionByCode(lines, 'REV');
  const cogsSection = findSectionByCode(lines, 'COGS');
  const opexSection = findSectionByCode(lines, 'OPEX');
  const otherSection = findSectionByCode(lines, 'OTHER');
  
  // Find specific accounts within the Other section
  let otherIncomeAccount = null;
  let otherExpenseAccount = null;
  if (otherSection && otherSection.children) {
    otherIncomeAccount = otherSection.children.find(child => child.section_code === 'OTHER_INCOME');
    otherExpenseAccount = otherSection.children.find(child => child.section_code === 'OTHER_EXP');
  }
  
  const netIncomeLine = findSectionByCode(lines, 'NET_INCOME');

  const revenueAmount = revenueSection ? calculateSectionTotal(revenueSection) : 0;
  const cogsAmount = cogsSection ? calculateSectionTotal(cogsSection) : 0;
  const opexAmount = opexSection ? calculateSectionTotal(opexSection) : 0;
  const otherIncomeAmount = otherIncomeAccount ? (parseFloat(otherIncomeAccount.amount) || 0) : 0;
  const otherExpenseAmount = otherExpenseAccount ? (parseFloat(otherExpenseAccount.amount) || 0) : 0;
  const netIncomeAmount = netIncomeLine ? (parseFloat(netIncomeLine.amount) || 0) : 0;
  
  const grossProfit = revenueAmount - cogsAmount;
  const grossMargin = revenueAmount !== 0 ? (grossProfit / revenueAmount) * 100 : 0;
  const operatingProfit = grossProfit - opexAmount;
  const operatingMargin = revenueAmount !== 0 ? (operatingProfit / revenueAmount) * 100 : 0;
  const totalOtherIncome = otherIncomeAmount - otherExpenseAmount;
  const netMargin = revenueAmount !== 0 ? (netIncomeAmount / revenueAmount) * 100 : 0;

  // Format period display
  const formatPeriodDisplay = (period) => {
    if (!period) return '';
    if (period.start_date && period.end_date) {
      return `${formatDate(period.start_date, 'MMM DD, YYYY')} - ${formatDate(period.end_date, 'MMM DD, YYYY')}`;
    }
    return period.name || period.code || '';
  };

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Revenue</div>
                <div className="text-2xl font-bold text-slate-900">{formatMoney(revenueAmount, 'GHS')}</div>
                <div className="text-xs text-slate-600 mt-1">Gross sales</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Gross Profit</div>
                <div className="text-2xl font-bold text-slate-900">{formatMoney(grossProfit, 'GHS')}</div>
                <div className="text-xs text-slate-600 mt-1">Margin: {grossMargin.toFixed(1)}%</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Operating Profit</div>
                <div className={`text-2xl font-bold ${operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(operatingProfit, 'GHS')}
                </div>
                <div className="text-xs text-slate-600 mt-1">Margin: {operatingMargin.toFixed(1)}%</div>
              </div>
              
              <div className={`bg-white rounded-lg shadow-sm border-2 p-6 ${netIncomeAmount >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Net Income</div>
                <div className={`text-2xl font-bold ${netIncomeAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(netIncomeAmount, 'GHS')}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Margin: {netMargin.toFixed(1)}%
                  {totalOtherIncome !== 0 && (
                    <span className="block mt-1">
                      {totalOtherIncome > 0 ? '+' : ''}{formatMoney(totalOtherIncome, 'GHS')} from other
                    </span>
                  )}
                </div>
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
                <div className="animate-pulse text-slate-600">Loading statement...</div>
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
                    {selectedPeriod?.name || selectedPeriod?.code || 'Selected Period'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatPeriodDisplay(selectedPeriod)}
                  </p>
                  {hasComparison && comparePeriod && (
                    <p className="text-xs text-slate-500 mt-2">
                      Compared with: {comparePeriod.name || comparePeriod.code}
                      {comparePeriod.start_date && comparePeriod.end_date && (
                        <span className="ml-2">
                          ({formatDate(comparePeriod.start_date, 'MMM DD, YYYY')} - {formatDate(comparePeriod.end_date, 'MMM DD, YYYY')})
                        </span>
                      )}
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

              {/* Other Income/Expenses Summary */}
              {(otherIncomeAmount !== 0 || otherExpenseAmount !== 0) && (
                <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Other Income & Expenses Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-blue-700">Other Income</div>
                      <div className={`text-lg font-bold ${otherIncomeAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatMoney(otherIncomeAmount, 'GHS')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-700">Other Expenses</div>
                      <div className={`text-lg font-bold ${otherExpenseAmount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatMoney(otherExpenseAmount, 'GHS')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-700">Net Other</div>
                      <div className={`text-lg font-bold ${totalOtherIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalOtherIncome >= 0 ? '+' : ''}{formatMoney(totalOtherIncome, 'GHS')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}