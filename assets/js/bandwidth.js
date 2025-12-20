// Bandwidth Analytics Script
// Fetches bandwidth data from the Diode Network API and displays it in a beautiful graph

(function() {
  'use strict';

  // Configuration
  const API_BASE_URL = 'https://registrar-prod.diode.link:8008/v1';
  const EPOCH_DURATION = 2592000; // 30 days in seconds

  // State
  let currentEpoch = null;
  let daysElapsedInCurrentEpoch = null; // Actual days elapsed in current epoch
  let bandwidthData = [];
  let chart = null;
  let epochVisibility = {}; // Track which epochs are visible
  let yAxisMax = null; // Calculated y-axis maximum for bandwidth based on current epoch
  let yAxisMaxNodes = null; // Calculated y-axis maximum for nodes based on current epoch
  let viewMode = 'bandwidth'; // 'bandwidth' or 'nodes'

  // Color palette for epochs (no red or orange colors)
  const epochColors = [
    '#4ECDC4', '#45B7D1', '#96CEB4', '#9B59B6', 
    '#3498DB', '#1ABC9C', '#34495E', '#7F8C8D',
    '#16A085', '#2980B9', '#8E44AD', '#27AE60'
  ];

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    initializePage();
  });

  function initializePage() {
    // Calculate current epoch
    const now = Math.floor(Date.now() / 1000);
    currentEpoch = Math.floor(now / EPOCH_DURATION);
    const epochStart = currentEpoch * EPOCH_DURATION;
    
    // Set fixed y-axis max for nodes view
    yAxisMaxNodes = 650;
    
    // Calculate days elapsed in current epoch (from epoch start to now)
    daysElapsedInCurrentEpoch = Math.floor((now - epochStart) / 86400) + 1; // +1 because day 1 starts at epoch start
    console.log('initializePage epoch calculation:', {
      now: now,
      currentEpoch: currentEpoch,
      epochStart: epochStart,
      secondsElapsed: now - epochStart,
      daysElapsedInCurrentEpoch: daysElapsedInCurrentEpoch
    });
    const daysText = `(${daysElapsedInCurrentEpoch} ${daysElapsedInCurrentEpoch === 1 ? 'day' : 'days'})`;
    
    // Update days labels immediately
    const totalBwDaysEl = document.getElementById('total-bandwidth-days');
    if (totalBwDaysEl) {
      totalBwDaysEl.textContent = daysText;
    }
    
    const nodesDaysEl = document.getElementById('active-nodes-days');
    if (nodesDaysEl) {
      nodesDaysEl.textContent = daysText;
    }

    // Initialize visibility state for all epochs we'll display
    // Only show first two epochs visually (current and previous)
    const epochsToShow = [];
    for (let i = 0; i <= 5; i++) {
      const epoch = currentEpoch - i;
      epochsToShow.push(epoch);
      // Only set visibility to true for first two epochs (current and previous)
      epochVisibility[epoch] = i <= 1;
    }
    // Show highest to lowest (newest to oldest) - no reverse needed

    // Render legend immediately
    renderLegend(epochsToShow);

    // Create toggle UI immediately (before data loads)
    createToggleUI();

    // Setup retry button
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', loadBandwidthData);
    }

    // Start loading data
    loadBandwidthData();
  }

  async function loadBandwidthData() {
    hideError();

    try {
      // Fetch current epoch first
      const currentData = await fetchBandwidthData(currentEpoch);
      if (!currentData) {
        throw new Error('Failed to fetch current epoch data');
      }

      bandwidthData = [currentData];
      // Current epoch is always visible (first epoch)
      epochVisibility[currentData.epoch] = true;
      updateStats(currentData);

      // Calculate y-axis max from current epoch data (only set once, never change)
      // Use the same days-elapsed calculation as the Total Bandwidth stat (client-side, not from API)
      if (currentData.daily_bandwidth && currentData.daily_bandwidth.length > 0 && daysElapsedInCurrentEpoch) {
        const lastDay = currentData.daily_bandwidth[currentData.daily_bandwidth.length - 1];
        // Use the same daysElapsedInCurrentEpoch that's used for the "(N days)" label in Total Bandwidth stat
        // This is calculated client-side in initializePage(), not from the API
        const daysElapsed = daysElapsedInCurrentEpoch;
        
        // Calculate bandwidth y-axis max
        if (!yAxisMax) {
          // Calculate average daily bandwidth: total_bandwidth / days_elapsed
          // Then project to full epoch: average * 30
          // Then multiply by 1.5x for safety margin in case current epoch is a down-epoch
          const averageDailyBandwidth = lastDay.total_bandwidth / daysElapsed;
          const projectedFullEpoch = averageDailyBandwidth * 30;
          yAxisMax = projectedFullEpoch * 1.5;
          console.log('Y-axis max calculation (bandwidth):', {
            total_bandwidth: lastDay.total_bandwidth,
            total_bandwidth_TB: (lastDay.total_bandwidth / (1024**4)).toFixed(2),
            daysElapsed: daysElapsed,
            averageDaily: averageDailyBandwidth,
            projected: projectedFullEpoch,
            projected_TB: (projectedFullEpoch / (1024**4)).toFixed(2),
            final: yAxisMax,
            final_TB: (yAxisMax / (1024**4)).toFixed(2)
          });
        }
        
        // Nodes y-axis max is already set to 650 in initializePage()
      }

      // Render chart immediately with current epoch
      renderChart();
      updateLegend();

      // Fetch past 5 epochs and add them incrementally
      for (let i = 1; i <= 5; i++) {
        const epoch = currentEpoch - i;
        const data = await fetchBandwidthData(epoch);
        if (data) {
          bandwidthData.push(data);
          // Only set visibility to true for the first past epoch (i === 1, which is currentEpoch - 1)
          // All other epochs (i > 1) remain hidden
          epochVisibility[data.epoch] = i === 1;
          // Re-render chart with new epoch added
          renderChart();
          updateLegend();
        }
      }
    } catch (error) {
      console.error('Error loading bandwidth data:', error);
      showError();
    }
  }

  async function fetchBandwidthData(epoch) {
    try {
      const url = `${API_BASE_URL}/network/bandwidth/${epoch}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching epoch ${epoch}:`, error);
      return null;
    }
  }

  function updateStats(currentData) {
    // Total Bandwidth (last day's total_bandwidth)
    const totalBwEl = document.getElementById('total-bandwidth-stat');
    const totalBwLoading = document.getElementById('total-bandwidth-loading');
    if (totalBwEl && currentData.daily_bandwidth && currentData.daily_bandwidth.length > 0) {
      const lastDay = currentData.daily_bandwidth[currentData.daily_bandwidth.length - 1];
      if (totalBwLoading) {
        totalBwLoading.remove();
      }
      totalBwEl.textContent = formatBytes(lastDay.total_bandwidth);
    }

    // Active Nodes (last day's node_count)
    const nodesEl = document.getElementById('active-nodes-stat');
    const nodesLoading = document.getElementById('active-nodes-loading');
    if (nodesEl && currentData.daily_bandwidth && currentData.daily_bandwidth.length > 0) {
      const lastDay = currentData.daily_bandwidth[currentData.daily_bandwidth.length - 1];
      if (nodesLoading) {
        nodesLoading.remove();
      }
      nodesEl.textContent = lastDay.node_count.toLocaleString();
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  function createToggleUI() {
    const chartTitleContainer = document.getElementById('chart-title');
    if (!chartTitleContainer) return;

    // Clear existing content and rebuild
    chartTitleContainer.innerHTML = '';
    chartTitleContainer.style.cssText = 'font-family: Poppins, sans-serif; font-size: 14px; margin-bottom: 8px; flex-shrink: 0; display: flex; align-items: center; gap: 12px;';
    
    // Create toggle switch
    const toggleSwitch = document.createElement('label');
    toggleSwitch.style.cssText = 'position: relative; display: inline-block; width: 50px; height: 26px; flex-shrink: 0;';
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.id = 'chart-view-toggle';
    toggleInput.checked = viewMode === 'nodes';
    toggleInput.style.cssText = 'opacity: 0; width: 0; height: 0;';
    toggleInput.addEventListener('change', function() {
      viewMode = this.checked ? 'nodes' : 'bandwidth';
      updateToggleUI();
      renderChart();
    });
    
    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'toggle-slider';
    toggleSlider.style.cssText = `
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${viewMode === 'nodes' ? '#D73E53' : '#ccc'};
      transition: 0.4s;
      border-radius: 26px;
    `;
    
    const toggleSliderBefore = document.createElement('span');
    toggleSliderBefore.className = 'toggle-slider-before';
    toggleSliderBefore.style.cssText = `
      position: absolute;
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
      transform: ${viewMode === 'nodes' ? 'translateX(24px)' : 'translateX(0)'};
    `;
    
    toggleSlider.appendChild(toggleSliderBefore);
    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(toggleSlider);
    
    // Bandwidth label (greyed out when nodes is selected)
    const bandwidthLabel = document.createElement('span');
    bandwidthLabel.textContent = 'Bandwidth';
    bandwidthLabel.style.cssText = `font-family: Poppins, sans-serif; font-size: 14px; font-weight: 500; color: ${viewMode === 'bandwidth' ? '#666' : '#ccc'}; cursor: pointer;`;
    bandwidthLabel.addEventListener('click', () => {
      viewMode = 'bandwidth';
      updateToggleUI();
      renderChart();
    });
    
    // Daily Nodes label (greyed out when bandwidth is selected)
    const dailyNodesLabel = document.createElement('span');
    dailyNodesLabel.textContent = 'Daily Nodes';
    dailyNodesLabel.style.cssText = `font-family: Poppins, sans-serif; font-size: 14px; font-weight: 500; color: ${viewMode === 'nodes' ? '#666' : '#ccc'}; cursor: pointer;`;
    dailyNodesLabel.addEventListener('click', () => {
      viewMode = 'nodes';
      updateToggleUI();
      renderChart();
    });
    
    // Append in fixed order: Bandwidth, toggle, Daily Nodes
    chartTitleContainer.appendChild(bandwidthLabel);
    chartTitleContainer.appendChild(toggleSwitch);
    chartTitleContainer.appendChild(dailyNodesLabel);
  }

  function updateToggleUI() {
    const chartTitleContainer = document.getElementById('chart-title');
    if (!chartTitleContainer) return;

    const toggleInput = document.getElementById('chart-view-toggle');
    if (toggleInput) {
      toggleInput.checked = viewMode === 'nodes';
      // Update slider position and color
      const toggleSlider = toggleInput.nextElementSibling;
      if (toggleSlider && toggleSlider.classList.contains('toggle-slider')) {
        toggleSlider.style.backgroundColor = viewMode === 'nodes' ? '#D73E53' : '#ccc';
        const sliderBefore = toggleSlider.querySelector('.toggle-slider-before');
        if (sliderBefore) {
          sliderBefore.style.transform = viewMode === 'nodes' ? 'translateX(24px)' : 'translateX(0)';
        }
      }
    }

    // Update label colors
    const labels = chartTitleContainer.querySelectorAll('span');
    if (labels.length >= 2) {
      // First span is Bandwidth label
      labels[0].style.color = viewMode === 'bandwidth' ? '#666' : '#ccc';
      // Last span is Daily Nodes label
      labels[labels.length - 1].style.color = viewMode === 'nodes' ? '#666' : '#ccc';
    }
  }

  function renderChart() {
    const chartContainer = document.getElementById('bandwidth-chart');
    if (!chartContainer) return;

    // Clear previous chart and loading message
    d3.select('#bandwidth-chart').selectAll('*').remove();
    const chartLoading = document.getElementById('chart-loading');
    if (chartLoading) {
      chartLoading.remove();
    }

    // Update toggle UI state (already created in initializePage)
    updateToggleUI();

    // Prepare data for visualization
    const allDataPoints = [];
    const extrapolatedPoints = [];
    bandwidthData.forEach((epochData, epochIndex) => {
      if (epochData.daily_bandwidth) {
        const currentEpochData = [];
        epochData.daily_bandwidth.forEach(day => {
          // For the current epoch (first one, index 0), only include data up to current day
          if (epochIndex === 0 && daysElapsedInCurrentEpoch && day.day > daysElapsedInCurrentEpoch) {
            return; // Skip this data point - don't plot future days from API
          }
          const dataPoint = {
            epoch: epochData.epoch,
            day: day.day,
            total_bandwidth: day.total_bandwidth,
            node_count: day.node_count,
            nodes_reporting_today: day.nodes_reporting_today,
            epochIndex: epochIndex,
            // Use day number directly so epochs overlay on same axis
            xValue: day.day,
            isExtrapolated: false
          };
          allDataPoints.push(dataPoint);
          
          // Collect current epoch data for linear fit
          if (epochIndex === 0 && epochData.epoch === currentEpoch) {
            currentEpochData.push(dataPoint);
          }
        });
        
        // For current epoch, extrapolate future days using linear fit
        if (epochIndex === 0 && epochData.epoch === currentEpoch && currentEpochData.length >= 2 && daysElapsedInCurrentEpoch && daysElapsedInCurrentEpoch < 30) {
          // Calculate linear fit: y = mx + b
          const n = currentEpochData.length;
          const sumX = currentEpochData.reduce((sum, d) => sum + d.day, 0);
          const sumY = currentEpochData.reduce((sum, d) => sum + (viewMode === 'bandwidth' ? d.total_bandwidth : d.nodes_reporting_today), 0);
          const sumXY = currentEpochData.reduce((sum, d) => sum + d.day * (viewMode === 'bandwidth' ? d.total_bandwidth : d.nodes_reporting_today), 0);
          const sumX2 = currentEpochData.reduce((sum, d) => sum + d.day * d.day, 0);
          
          const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          const b = (sumY - m * sumX) / n;
          
          // Extrapolate for days from (daysElapsedInCurrentEpoch + 1) to 30
          for (let day = daysElapsedInCurrentEpoch + 1; day <= 30; day++) {
            const extrapolatedValue = m * day + b;
            const extrapolatedPoint = {
              epoch: epochData.epoch,
              day: day,
              total_bandwidth: viewMode === 'bandwidth' ? extrapolatedValue : currentEpochData[currentEpochData.length - 1].total_bandwidth,
              node_count: currentEpochData[currentEpochData.length - 1].node_count,
              nodes_reporting_today: viewMode === 'nodes' ? Math.max(0, Math.round(extrapolatedValue)) : currentEpochData[currentEpochData.length - 1].nodes_reporting_today,
              epochIndex: epochIndex,
              xValue: day,
              isExtrapolated: true
            };
            extrapolatedPoints.push(extrapolatedPoint);
          }
        }
      }
    });
    
    // Add extrapolated points to allDataPoints
    allDataPoints.push(...extrapolatedPoints);

    if (allDataPoints.length === 0) {
      chartContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No data available</p>';
      return;
    }

    // Set up dimensions
    // Adjust margins for mobile view
    const isMobile = window.innerWidth <= 768;
    const margin = { 
      top: 40, 
      right: isMobile ? 20 : 80, 
      bottom: 60, 
      left: isMobile ? 80 : 100 
    };
    const containerWidth = chartContainer.offsetWidth;
    const containerHeight = chartContainer.offsetHeight;
    // On mobile, use container width; on desktop, use container width
    // The chart content will scale to fit, but we ensure minimum readable width
    const svgWidth = containerWidth;
    const width = svgWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create SVG - use calculated dimensions
    const svg = d3.select('#bandwidth-chart')
      .append('svg')
      .attr('width', svgWidth)
      .attr('height', containerHeight)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Scales - x-axis always uses day numbers 1-30, all epochs overlay
    const xScale = d3.scale.linear()
      .domain([1, 30]) // Always 30 days, regardless of data
      .range([0, width]);

    // Use calculated y-axis max if available (never change it once set), otherwise use data max with 1.1x padding
    // For bandwidth view, use yAxisMax; for nodes view, use yAxisMaxNodes
    // Define yValue function to get the appropriate value based on view mode
    const yValue = viewMode === 'bandwidth' ? d => d.total_bandwidth : d => d.nodes_reporting_today;
    const dataMax = d3.max(allDataPoints, yValue) || 0;
    const yMax = viewMode === 'bandwidth' 
      ? (yAxisMax || (dataMax * 1.1))
      : (yAxisMaxNodes || (dataMax * 1.1));
    const yScale = d3.scale.linear()
      .domain([0, yMax])
      .range([height, 0]);

    // Create line generator - use bandwidth or node_count based on view mode
    const line = d3.svg.line()
      .x(d => xScale(d.xValue))
      .y(d => yScale(yValue(d)))
      .interpolate('monotone');

    // Group data by epoch
    const epochGroups = d3.nest()
      .key(d => d.epoch)
      .entries(allDataPoints);

    // Draw lines for each epoch
    // Sort epochs to ensure current epoch is drawn LAST (so it appears on top)
    const sortedEpochGroups = epochGroups.sort((a, b) => {
      const epochA = parseInt(a.key);
      const epochB = parseInt(b.key);
      // Current epoch always last (drawn on top)
      if (epochA === currentEpoch) return 1;
      if (epochB === currentEpoch) return -1;
      // Then sort by epoch number (newest first)
      return epochB - epochA;
    });

    sortedEpochGroups.forEach((group, index) => {
      const epoch = parseInt(group.key);
      // Only show first two epochs visually (current and current-1) initially
      const epochOffset = currentEpoch - epoch;
      const shouldShow = epochOffset <= 1; // 0 = current, 1 = previous
      
      // Current epoch is always red
      const isCurrentEpoch = epoch === currentEpoch;
      // For other epochs, use a consistent color based on epoch number (not index)
      // This ensures the color never changes as new epochs are added
      const color = isCurrentEpoch ? '#FF0000' : epochColors[Math.abs(epoch) % epochColors.length];
      const sortedData = group.values.sort((a, b) => a.xValue - b.xValue);
      // Use epochVisibility if explicitly set, otherwise use shouldShow for initial state
      // This allows manually toggled epochs to remain visible even if they're not in the first two
      const isVisible = epochVisibility[epoch] !== undefined 
        ? epochVisibility[epoch] !== false 
        : shouldShow;

      // Separate real data from extrapolated for current epoch
      const realData = isCurrentEpoch ? sortedData.filter(d => !d.isExtrapolated) : sortedData;
      const extrapData = isCurrentEpoch ? sortedData.filter(d => d.isExtrapolated) : [];
      
      // Draw line for real data
      if (realData.length > 0) {
        svg.append('path')
          .datum(realData)
          .attr('class', 'bandwidth-line')
          .attr('data-epoch', epoch)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2.5)
          .attr('opacity', isVisible ? 0.8 : 0)
          .style('pointer-events', isVisible ? 'all' : 'none')
          .on('mousemove', function(d) {
            // Check current visibility state dynamically
            const currentEpoch = parseInt(d3.select(this).attr('data-epoch'));
            const currentlyVisible = epochVisibility[currentEpoch] !== false;
            if (currentlyVisible) {
              const event = d3.event;
              // Find the closest data point to the mouse position
              const mouseX = xScale.invert(d3.mouse(this)[0]);
              const closestPoint = realData.reduce((prev, curr) => {
                return Math.abs(curr.xValue - mouseX) < Math.abs(prev.xValue - mouseX) ? curr : prev;
              });
              showTooltip(event, closestPoint, color);
            }
          })
          .on('mouseout', hideTooltip);
      }
      
      // Draw extrapolated line portion with transparency (only for current epoch)
      if (extrapData.length > 0 && realData.length > 0) {
        // Combine last real point with extrapolated points for smooth transition
        const extrapLineData = [realData[realData.length - 1], ...extrapData];
        svg.append('path')
          .datum(extrapLineData)
          .attr('class', 'bandwidth-line-extrapolated')
          .attr('data-epoch', epoch)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '5,5') // Dashed line for extrapolated portion
          .attr('opacity', isVisible ? 0.3 : 0) // Transparent extrapolated line
          .style('pointer-events', 'none'); // No interaction with extrapolated line
      }

      // Draw real data points (realData and extrapData already defined above)
      svg.selectAll('.dot-' + group.key)
        .data(realData)
        .enter()
        .append('circle')
        .attr('class', 'bandwidth-dot')
        .attr('data-epoch', epoch)
        .attr('cx', d => xScale(d.xValue))
        .attr('cy', d => yScale(yValue(d)))
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .attr('opacity', isVisible ? 1 : 0)
        .style('pointer-events', isVisible ? 'all' : 'none')
        .on('mouseover', function(d) {
          // Check current visibility state dynamically
          const currentEpoch = parseInt(d3.select(this).attr('data-epoch'));
          const currentlyVisible = epochVisibility[currentEpoch] !== false;
          if (currentlyVisible) {
            const event = d3.event;
            showTooltip(event, d, color);
          }
        })
        .on('mouseout', hideTooltip);
      
      // Draw extrapolated points with transparency
      svg.selectAll('.dot-extrapolated-' + group.key)
        .data(extrapData)
        .enter()
        .append('circle')
        .attr('class', 'bandwidth-dot-extrapolated')
        .attr('data-epoch', epoch)
        .attr('cx', d => xScale(d.xValue))
        .attr('cy', d => yScale(yValue(d)))
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .attr('opacity', isVisible ? 0.3 : 0) // Transparent extrapolated points
        .style('pointer-events', 'none') // No interaction with extrapolated points
        .on('mouseover', function(d) {
          // Check current visibility state dynamically (though extrapolated points shouldn't be interactive)
          const currentEpoch = parseInt(d3.select(this).attr('data-epoch'));
          const currentlyVisible = epochVisibility[currentEpoch] !== false;
          if (currentlyVisible) {
            const event = d3.event;
            showTooltip(event, d, color);
          }
        })
        .on('mouseout', hideTooltip);
    });

    // Grid lines - draw BEFORE axes so axes appear on top
    svg.selectAll('.grid-line')
      .data(yScale.ticks(10))
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // X Axis - show ticks for each day, label every 10th day
    // Generate tick values explicitly for days 1-30
    const xTickValues = d3.range(1, 31); // [1, 2, 3, ..., 30]
    const xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .tickValues(xTickValues) // Explicitly set tick positions to day values
      .tickSize(10) // 10px total height (5px above and 5px below axis)
      .tickFormat(d => {
        const day = Math.round(d);
        // Show label only for every 10th day (1, 10, 20, 30)
        if (day % 10 === 0 || day === 1) {
          return day.toString();
        }
        return '';
      });

    const xAxisGroup = svg.append('g')
      .attr('class', 'axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

    // Style tick lines - center them on the axis (5px above and 5px below y=0)
    xAxisGroup.selectAll('line')
      .attr('stroke', '#999')
      .attr('stroke-width', '1px')
      .attr('y1', -5) // 5px above axis
      .attr('y2', 5);  // 5px below axis

    // Remove any existing domain path and create a new one to ensure it's correct
    // Draw it AFTER ticks so it appears on top
    xAxisGroup.select('path.domain').remove();
    
    // Create x-axis line manually at y=0 (relative to the transformed group)
    // Use a line element instead of path for better control
    xAxisGroup.append('line')
      .attr('class', 'domain')
      .attr('x1', xScale.range()[0])
      .attr('x2', xScale.range()[1])
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', '#999')
      .attr('stroke-width', '1px')
      .attr('stroke-dasharray', '') // Empty string to ensure solid line
      .attr('fill', 'none');

    // Style tick lines and labels
    xAxisGroup.selectAll('text')
      .style('text-anchor', 'middle')
      .style('font-family', 'Poppins, sans-serif')
      .style('font-size', '12px')
      .style('fill', '#666');

    // Add vertical line for current day in epoch
    if (daysElapsedInCurrentEpoch && daysElapsedInCurrentEpoch <= 30) {
      const currentDayX = xScale(daysElapsedInCurrentEpoch);
      svg.append('line')
        .attr('class', 'current-day-line')
        .attr('x1', currentDayX)
        .attr('x2', currentDayX)
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#FF6B6B')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.7);
    }

    // Y Axis - format based on view mode
    const yAxis = d3.svg.axis()
      .scale(yScale)
      .orient('left')
      .tickFormat(d => viewMode === 'bandwidth' ? formatBytes(d) : d.toLocaleString());

    const yAxisGroup = svg.append('g')
      .attr('class', 'axis')
      .call(yAxis);

    // Set axis line styling - 1px width, gray color, solid line
    // d3 creates a path with class 'domain' for the axis line
    const yAxisPath = yAxisGroup.select('path.domain');
    if (yAxisPath.empty()) {
      // If path doesn't exist, create it manually
      yAxisGroup.append('path')
        .attr('class', 'domain')
        .attr('d', 'M' + 0 + ',' + yScale.range()[0] + 'V' + yScale.range()[1]);
    }
    yAxisGroup.select('path.domain')
      .attr('stroke', '#999')
      .attr('stroke-width', '1px')
      .attr('stroke-dasharray', '') // Empty string to ensure solid line
      .attr('fill', 'none');

    // Style tick lines - center them on the axis (5px to left and 5px to right of x=0)
    yAxisGroup.selectAll('line')
      .attr('stroke', '#999')
      .attr('stroke-width', '1px')
      .attr('x1', -5) // 5px to left of axis
      .attr('x2', 5);  // 5px to right of axis

    // Style tick labels
    yAxisGroup.selectAll('text')
      .style('font-family', 'Poppins, sans-serif')
      .style('font-size', '12px')
      .style('fill', '#666');

    // Axis labels
    // Adjust y-axis label position for mobile to avoid overlap with tick labels
    const yAxisLabelX = isMobile ? (0 - (height / 2) - 15) : (0 - (height / 2));
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', yAxisLabelX)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-family', 'Poppins, sans-serif')
      .style('font-size', '14px')
      .style('fill', '#333')
      .text(viewMode === 'bandwidth' ? 'Network Bandwidth' : 'Daily Nodes');

    svg.append('text')
      .attr('transform', 'translate(' + (width / 2) + ' ,' + (height + margin.bottom - 10) + ')')
      .style('text-anchor', 'middle')
      .style('font-family', 'Poppins, sans-serif')
      .style('font-size', '14px')
      .style('fill', '#333')
      .text('Day');
  }

  function renderLegend(epochs) {
    const legendEl = document.getElementById('epoch-legend');
    if (!legendEl) return;

    legendEl.innerHTML = '';

    epochs.forEach((epoch, index) => {
      // Use same color assignment logic as chart lines
      // Current epoch is always red, others use epoch number to determine color
      const isCurrentEpoch = epoch === currentEpoch;
      const color = isCurrentEpoch ? '#FF0000' : epochColors[Math.abs(epoch) % epochColors.length];
      // Check if this epoch has data loaded
      const hasData = bandwidthData.some(d => d.epoch === epoch);
      const isVisible = epochVisibility[epoch] !== false && hasData;

      const legendItem = document.createElement('div');
      legendItem.className = 'epoch-legend-item';
      legendItem.setAttribute('data-epoch', epoch);
      // Show as inactive/grayed out if data hasn't loaded yet
      const isLoaded = hasData;
      const itemBackground = isLoaded 
        ? (isVisible ? '#f5f5f5' : '#e0e0e0')
        : '#f0f0f0';
      legendItem.style.cssText = `display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 8px; background: ${itemBackground}; border-radius: 4px; cursor: ${isLoaded ? 'pointer' : 'default'}; transition: all 0.2s; user-select: none; opacity: ${isLoaded ? '1' : '0.6'};`;
      if (isLoaded) {
        legendItem.addEventListener('click', () => toggleEpochVisibility(epoch));
      }
      if (isLoaded) {
        legendItem.addEventListener('mouseenter', function() {
          const currentlyVisible = epochVisibility[epoch] !== false;
          if (currentlyVisible) {
            this.style.background = '#e8e8e8';
          } else {
            this.style.background = '#d0d0d0';
          }
        });
        legendItem.addEventListener('mouseleave', function() {
          const currentlyVisible = epochVisibility[epoch] !== false;
          this.style.background = currentlyVisible ? '#f5f5f5' : '#e0e0e0';
        });
      }
      
      const colorBox = document.createElement('div');
      // Show color box with reduced opacity if data hasn't loaded
      const boxOpacity = hasData ? (isVisible ? 1 : 0.3) : 0.2;
      colorBox.style.cssText = `width: 12px; height: 12px; background: ${color}; border-radius: 2px; opacity: ${boxOpacity}; flex-shrink: 0;`;
      
      const label = document.createElement('span');
      // Show label as grayed out if data hasn't loaded
      const labelColor = hasData ? (isVisible ? '#333' : '#999') : '#bbb';
      const labelDecoration = hasData && !isVisible ? 'line-through' : 'none';
      label.style.cssText = `font-family: Poppins, sans-serif; font-size: 12px; color: ${labelColor}; text-decoration: ${labelDecoration}; font-weight: 500;`;
      label.textContent = epoch;
      
      legendItem.appendChild(colorBox);
      legendItem.appendChild(label);
      legendEl.appendChild(legendItem);
    });
  }

  function updateLegend() {
    // Always show all epochs (current + past 5), mark them as loaded/active as data arrives
    const epochsToShow = [];
    for (let i = 0; i <= 5; i++) {
      const epoch = currentEpoch - i;
      epochsToShow.push(epoch);
    }
    renderLegend(epochsToShow);
  }

  function toggleEpochVisibility(epoch) {
    // Toggle visibility state
    epochVisibility[epoch] = !epochVisibility[epoch];
    const isVisible = epochVisibility[epoch];

    // Update chart elements (if they exist - chart may not be rendered yet)
    d3.selectAll(`.bandwidth-line[data-epoch="${epoch}"]`)
      .attr('opacity', isVisible ? 0.8 : 0)
      .style('pointer-events', isVisible ? 'all' : 'none');

    d3.selectAll(`.bandwidth-dot[data-epoch="${epoch}"]`)
      .attr('opacity', isVisible ? 1 : 0)
      .style('pointer-events', isVisible ? 'all' : 'none');

    // Update legend item
    const legendItem = document.querySelector(`.epoch-legend-item[data-epoch="${epoch}"]`);
    if (legendItem) {
      const colorBox = legendItem.querySelector('div');
      const label = legendItem.querySelector('span');
      
      legendItem.style.background = isVisible ? '#f5f5f5' : '#e0e0e0';
      if (colorBox) {
        colorBox.style.opacity = isVisible ? 1 : 0.3;
      }
      if (label) {
        label.style.color = isVisible ? '#333' : '#999';
        label.style.textDecoration = isVisible ? 'none' : 'line-through';
      }
    }
  }

  function showTooltip(event, data, color) {
    // Remove existing tooltip
    d3.select('.bandwidth-tooltip').remove();

    // Calculate the date for this day in the epoch
    // Epoch start time = epoch * EPOCH_DURATION
    // Day 1 starts at epoch start, so day N is at epochStart + (N-1) * 86400 seconds
    const epochStart = data.epoch * EPOCH_DURATION;
    const dayTimestamp = epochStart + (data.day - 1) * 86400;
    const date = new Date(dayTimestamp * 1000);
    const dateString = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });

    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'bandwidth-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.85)')
      .style('color', '#fff')
      .style('padding', '12px 16px')
      .style('border-radius', '6px')
      .style('font-family', 'Poppins, sans-serif')
      .style('font-size', '13px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.2)');

    const mainValue = viewMode === 'bandwidth' 
      ? `Bandwidth: <strong>${formatBytes(data.total_bandwidth)}</strong>`
      : `Daily Nodes: <strong>${data.nodes_reporting_today.toLocaleString()}</strong>`;
    
    tooltip.html(`
      <div style="margin-bottom: 4px;"><strong>Epoch ${data.epoch}, Day ${data.day}</strong></div>
      <div style="margin-bottom: 2px;">Date: <strong>${dateString}</strong></div>
      <div style="margin-bottom: 2px;">${mainValue}</div>
      ${viewMode === 'bandwidth' 
        ? `<div style="margin-bottom: 2px;">Daily Nodes: <strong>${data.nodes_reporting_today.toLocaleString()}</strong></div>`
        : `<div style="margin-bottom: 2px;">Bandwidth: <strong>${formatBytes(data.total_bandwidth)}</strong></div>`}
      <div>Total Nodes: <strong>${data.node_count.toLocaleString()}</strong></div>
    `);

    tooltip.style('left', (event.pageX + 10) + 'px')
           .style('top', (event.pageY - 10) + 'px');
  }

  function hideTooltip() {
    d3.select('.bandwidth-tooltip').remove();
  }

  function showError() {
    const el = document.getElementById('error-state');
    if (el) el.style.display = 'block';
  }

  function hideError() {
    const el = document.getElementById('error-state');
    if (el) el.style.display = 'none';
  }
})();

