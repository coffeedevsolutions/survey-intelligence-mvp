import React, { useState } from 'react';
import { KpiCard } from './components/KpiCard';
import WorkflowFunnel from './components/WorkflowFunnel';
import IntakeVolumeChart from './components/IntakeVolumeChart';
import CategoryChart from './components/CategoryChart';
import StatusDistributionChart from './components/StatusDistributionChart';
import SubmissionPatternsChart from './components/SubmissionPatternsChart';
import TopCampaignsTable from './components/TopCampaignsTable';
import RecentDocumentsTable from './components/RecentDocumentsTable';
import {
  FileInput,
  FileCheck,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Skeleton, KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../../components/ui/skeleton.jsx';
import { useDashboardAnalytics } from '../../hooks/useDashboardAnalytics';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/datepicker.css';

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [pendingDateRange, setPendingDateRange] = useState(null);
  const selectRef = React.useRef(null);
  const calendarRef = React.useRef(null);
  const { data: analyticsData, loading, error } = useDashboardAnalytics(timeRange, customDateRange);

  // Debug state changes
  React.useEffect(() => {
    console.log('Dashboard state changed:', { timeRange, customDateRange, startDate, endDate });
  }, [timeRange, customDateRange, startDate, endDate]);

  // Handle click outside to close calendar
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isCustomRangeOpen &&
        calendarRef.current &&
        !calendarRef.current.contains(event.target) &&
        selectRef.current &&
        !selectRef.current.contains(event.target)
      ) {
        setIsCustomRangeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomRangeOpen]);

  // Calculate KPIs from real data
  const newRequests = analyticsData?.new_requests || 0;
  const awaitingReview = analyticsData?.awaiting_review || 0;
  const prioritized = analyticsData?.prioritized || 0;
  const avgTimeToBrief = analyticsData?.avg_time_to_backlog_days 
    ? (() => {
        const totalHours = Number(analyticsData.avg_time_to_backlog_days) * 24;
        const days = Math.floor(totalHours / 24);
        const hours = Math.round(totalHours % 24);
        
        if (days === 0) {
          return `${hours}h`;
        } else if (hours === 0) {
          return `${days}d`;
        } else {
          return `${days}d ${hours}h`;
        }
      })()
    : "N/A";
  const briefToJiraConversion = analyticsData?.brief_to_backlog_conversion 
    ? `${analyticsData.brief_to_backlog_conversion}%` 
    : "0%";
  const predictedImpact = prioritized > 10 ? "High" : prioritized > 5 ? "Medium" : "Low";

  // Helper functions for date range
  const getDateRange = (range) => {
    const now = new Date();
    let startDate, endDate;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'custom':
        if (customDateRange?.from && customDateRange?.to) {
          startDate = customDateRange.from;
          endDate = customDateRange.to;
        } else {
          return 'Custom Range';
        }
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
    }
    
    const formatDate = (date) => {
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getDisplayDateRange = (range) => {
    // Show actual custom range dates instead of "Custom Range"
    if (range === 'custom' && customDateRange?.from && customDateRange?.to) {
      const formatDate = (date) => {
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
      };
      return `${formatDate(customDateRange.from)} - ${formatDate(customDateRange.to)}`;
    }
    return getDateRange(range);
  };

  const handleTimeRangeChange = (value) => {
    if (value === 'custom') {
      setIsCustomRangeOpen(true);
      // Initialize dates with current custom date range if it exists
      if (customDateRange?.from && customDateRange?.to) {
        setStartDate(customDateRange.from);
        setEndDate(customDateRange.to);
      }
    } else {
      // For predefined ranges, apply immediately
      setTimeRange(value);
      setCustomDateRange(null);
      setStartDate(null);
      setEndDate(null);
      setPendingDateRange(null);
    }
  };

  const handleDateRangeChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    
    // Store pending range but don't apply yet
    if (start && end) {
      setPendingDateRange({ from: start, to: end });
    }
  };

  const handleClearSelection = () => {
    setStartDate(null);
    setEndDate(null);
    setPendingDateRange(null);
  };

  const handleStartDateChange = (date) => {
    setStartDate(date);
    if (date && endDate) {
      setPendingDateRange({ from: date, to: endDate });
    }
  };

  const handleEndDateChange = (date) => {
    setEndDate(date);
    if (date && startDate) {
      setPendingDateRange({ from: startDate, to: date });
    }
  };

  const handleApplyCustomRange = () => {
    if (startDate && endDate) {
      const newCustomRange = { from: startDate, to: endDate };
      console.log('Applying custom range:', newCustomRange);
      setCustomDateRange(newCustomRange);
      setTimeRange('custom');
      setIsCustomRangeOpen(false);
      setPendingDateRange(null);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading dashboard: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

        return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Intake & Delivery Overview</h1>
          <p className="text-sm lg:text-base text-muted-foreground mt-1">Monitor your project intake pipeline and delivery metrics</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-3 relative flex-shrink-0">
          <div ref={selectRef} className="min-w-0">
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="bg-white border-gray-200 shadow-sm hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full min-w-[140px] max-w-[200px]">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <SelectValue placeholder="Select time range" />
                </div>
            </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 shadow-lg">
                <SelectItem value="7d" className="hover:bg-gray-50 focus:bg-gray-50">
                  Last 7 days
                </SelectItem>
                <SelectItem value="30d" className="hover:bg-gray-50 focus:bg-gray-50">
                  Last 30 days
                </SelectItem>
                <SelectItem value="90d" className="hover:bg-gray-50 focus:bg-gray-50">
                  Last 90 days
                </SelectItem>
                <SelectItem value="1y" className="hover:bg-gray-50 focus:bg-gray-50">
                  Last year
                </SelectItem>
                <SelectItem value="custom" className="hover:bg-gray-50 focus:bg-gray-50">
                  Custom range
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isCustomRangeOpen && (
            <div ref={calendarRef} className="absolute top-full right-0 z-50 mt-2">
              <div className="w-auto min-w-[600px] max-w-[90vw] p-4 bg-white border border-gray-200 shadow-lg rounded-md">
                {/* Manual Date Input Fields */}
                <div className="mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">Enter Date Range</div>
                    {startDate && (
                      <Button
                        onClick={handleClearSelection}
                        variant="outline"
                        className="px-3 py-1 text-xs text-gray-600 border-gray-300 hover:bg-gray-50"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                      <DatePicker
                        selected={startDate}
                        onChange={handleStartDateChange}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholderText="Select start date"
                        dateFormat="yyyy-MM-dd"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">End Date</label>
                      <DatePicker
                        selected={endDate}
                        onChange={handleEndDateChange}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholderText="Select end date"
                        dateFormat="yyyy-MM-dd"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleApplyCustomRange}
                        className={`px-4 py-2 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          pendingDateRange 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!startDate || !endDate}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="border-t border-gray-200 mb-4"></div>
                
                {/* Calendar Component */}
                <div className="text-sm font-medium text-gray-700 mb-2">Or select from calendar</div>
                <DatePicker
                  selected={startDate}
                  onChange={handleDateRangeChange}
                  startDate={startDate}
                  endDate={endDate}
                  selectsRange
                  inline
                  monthsShown={2}
                  className="react-datepicker-custom"
                />
              </div>
            </div>
          )}
          
          <div className="text-xs lg:text-sm text-gray-600 bg-gray-50 px-2 lg:px-3 py-2 rounded-md border min-w-[100px] lg:min-w-[120px] text-center flex-shrink-0">
            {loading ? (
              <Skeleton className="h-3 lg:h-4 w-16 lg:w-20 mx-auto" />
            ) : (
              <span>{getDisplayDateRange(timeRange)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
        {loading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="New Requests"
              value={newRequests.toString()}
              trend={analyticsData?.newRequestsTrend || 0}
              trendLabel="vs last period"
              icon={<FileInput className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Awaiting Review"
              value={awaitingReview.toString()}
              trend={analyticsData?.awaitingReviewTrend || 0}
              trendLabel="vs last period"
              icon={<FileCheck className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Prioritized"
              value={prioritized.toString()}
              trend={analyticsData?.prioritizedTrend || 0}
              trendLabel="vs last period"
              icon={<CheckCircle2 className="w-5 h-5 text-success" />}
            />
            <KpiCard
              title="Avg Time to Backlog"
              value={avgTimeToBrief}
              trend={analyticsData?.avgTimeToBacklogTrend || 0}
              trendLabel="improvement"
              icon={<Clock className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Brief→Backlog"
              value={briefToJiraConversion}
              trend={analyticsData?.briefToBacklogConversionTrend || 0}
              trendLabel="conversion"
              icon={<ArrowRightLeft className="w-5 h-5 text-primary" />}
            />
            <KpiCard
              title="Predicted Impact"
              value={predictedImpact}
              variant="gradient"
              icon={<TrendingUp className="w-5 h-5 text-white" />}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {loading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <IntakeVolumeChart data={analyticsData} timeRange={timeRange} />
            <CategoryChart data={analyticsData} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {loading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <StatusDistributionChart data={analyticsData} />
            <SubmissionPatternsChart data={analyticsData} />
          </>
        )}
      </div>

      {/* Workflow Funnel */}
      {loading ? (
        <ChartSkeleton />
      ) : (
        <WorkflowFunnel data={analyticsData} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {loading ? (
          <>
            <TableSkeleton />
            <TableSkeleton />
          </>
        ) : (
          <>
            <TopCampaignsTable data={analyticsData} />
            <RecentDocumentsTable data={analyticsData} />
          </>
        )}
      </div>
    </div>
  );
}