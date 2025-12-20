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
  let yAxisMax = null; // Calculated y-axis maximum based on current epoch

  // Color palette for epochs
  const epochColors = [
    '#4ECDC4', '#45B7D1', '#96CEB4', '#FF6B6B', 
    '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
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
    const epochsToShow = [];
    for (let i = 0; i <= 5; i++) {
      const epoch = currentEpoch - i;
      epochsToShow.push(epoch);
      epochVisibility[epoch] = true;
    }
    // Show highest to lowest (newest to oldest) - no reverse needed

    // Render legend immediately
    renderLegend(epochsToShow);

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
      epochVisibility[currentData.epoch] = true;
      updateStats(currentData);

      // Calculate y-axis max from current epoch data (only set once, never change)
      // Use the same days-elapsed calculation as the Total Bandwidth stat (client-side, not from API)
      if (currentData.daily_bandwidth && currentData.daily_bandwidth.length > 0 && !yAxisMax && daysElapsedInCurrentEpoch) {
        const lastDay = currentData.daily_bandwidth[currentData.daily_bandwidth.length - 1];
        // Use the same daysElapsedInCurrentEpoch that's used for the "(N days)" label in Total Bandwidth stat
        // This is calculated client-side in initializePage(), not from the API
        const daysElapsed = daysElapsedInCurrentEpoch;
        // Calculate average daily bandwidth: total_bandwidth / days_elapsed
        // Then project to full epoch: average * 30
        // Then multiply by 1.5x for safety margin in case current epoch is a down-epoch
        const averageDailyBandwidth = lastDay.total_bandwidth / daysElapsed;
        const projectedFullEpoch = averageDailyBandwidth * 30;
        yAxisMax = projectedFullEpoch * 1.5;
        console.log('Y-axis max calculation (using client-side days elapsed):', {
          total_bandwidth: lastDay.total_bandwidth,
          total_bandwidth_TB: (lastDay.total_bandwidth / (1024**4)).toFixed(2),
          daysElapsed: daysElapsed, // Same value as shown in "(N days)" label
          averageDaily: averageDailyBandwidth,
          projected: projectedFullEpoch,
          projected_TB: (projectedFullEpoch / (1024**4)).toFixed(2),
          final: yAxisMax,
          final_TB: (yAxisMax / (1024**4)).toFixed(2)
        });
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
          epochVisibility[data.epoch] = true;
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

  function renderChart() {
    const chartContainer = document.getElementById('bandwidth-chart');
    if (!chartContainer) return;

    // Clear previous chart and loading message
    d3.select('#bandwidth-chart').selectAll('*').remove();
    const chartLoading = document.getElementById('chart-loading');
    if (chartLoading) {
      chartLoading.remove();
    }

    // Prepare data for visualization
    const allDataPoints = [];
    bandwidthData.forEach((epochData, epochIndex) => {
      if (epochData.daily_bandwidth) {
        epochData.daily_bandwidth.forEach(day => {
          allDataPoints.push({
            epoch: epochData.epoch,
            day: day.day,
            total_bandwidth: day.total_bandwidth,
            node_count: day.node_count,
            nodes_reporting_today: day.nodes_reporting_today,
            epochIndex: epochIndex,
            // Use day number directly so epochs overlay on same axis
            xValue: day.day
          });
        });
      }
    });

    if (allDataPoints.length === 0) {
      chartContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No data available</p>';
      return;
    }

    // Set up dimensions
    const margin = { top: 40, right: 80, bottom: 60, left: 100 };
    const containerWidth = chartContainer.offsetWidth;
    const containerHeight = chartContainer.offsetHeight;
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create SVG - use container dimensions
    const svg = d3.select('#bandwidth-chart')
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Scales - x-axis uses day numbers (1-30), all epochs overlay
    const maxDay = d3.max(allDataPoints, d => d.day) || 30;
    const xScale = d3.scale.linear()
      .domain([1, maxDay])
      .range([0, width]);

    // Use calculated y-axis max if available (never change it once set), otherwise use data max with 1.1x padding
    const dataMax = d3.max(allDataPoints, d => d.total_bandwidth) || 0;
    const yMax = yAxisMax || (dataMax * 1.1);
    console.log('renderChart y-axis:', {
      yAxisMax: yAxisMax,
      yAxisMax_TB: yAxisMax ? (yAxisMax / (1024**4)).toFixed(2) : null,
      dataMax: dataMax,
      dataMax_TB: (dataMax / (1024**4)).toFixed(2),
      yMax: yMax,
      yMax_TB: (yMax / (1024**4)).toFixed(2)
    });
    const yScale = d3.scale.linear()
      .domain([0, yMax])
      .range([height, 0]);

    // Create line generator
    const line = d3.svg.line()
      .x(d => xScale(d.xValue))
      .y(d => yScale(d.total_bandwidth))
      .interpolate('monotone');

    // Group data by epoch
    const epochGroups = d3.nest()
      .key(d => d.epoch)
      .entries(allDataPoints);

    // Draw lines for each epoch
    epochGroups.forEach((group, index) => {
      const epoch = parseInt(group.key);
      const color = epochColors[index % epochColors.length];
      const sortedData = group.values.sort((a, b) => a.xValue - b.xValue);
      const isVisible = epochVisibility[epoch] !== false;

      // Draw line
      svg.append('path')
        .datum(sortedData)
        .attr('class', 'bandwidth-line')
        .attr('data-epoch', epoch)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('opacity', isVisible ? 0.8 : 0)
        .style('pointer-events', isVisible ? 'all' : 'none');

      // Draw dots
      svg.selectAll('.dot-' + group.key)
        .data(sortedData)
        .enter()
        .append('circle')
        .attr('class', 'bandwidth-dot')
        .attr('data-epoch', epoch)
        .attr('cx', d => xScale(d.xValue))
        .attr('cy', d => yScale(d.total_bandwidth))
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .attr('opacity', isVisible ? 1 : 0)
        .style('pointer-events', isVisible ? 'all' : 'none')
        .on('mouseover', function(event, d) {
          if (isVisible) {
            showTooltip(event, d, color);
          }
        })
        .on('mouseout', hideTooltip);
    });

    // X Axis
    const xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .tickFormat(d => {
        // Format as "Epoch X"
        // Calculate which epoch this xValue belongs to
        const epochOffset = Math.floor(d / 30);
        const epoch = currentEpoch + epochOffset;
        const day = Math.round(d % 30);
        // Show epoch label at the start of each epoch
        if (Math.abs(day) < 1 || Math.abs(day - 30) < 1) {
          return `E${epoch}`;
        }
        return '';
      });

    svg.append('g')
      .attr('class', 'axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'middle')
      .style('font-family', 'Poppins, sans-serif')
      .style('font-size', '12px')
      .style('fill', '#666');

    // Y Axis
    const yAxis = d3.svg.axis()
      .scale(yScale)
      .orient('left')
      .tickFormat(d => formatBytes(d));

    svg.append('g')
      .attr('class', 'axis')
      .call(yAxis)
      .selectAll('text')
      .style('font-family', 'Poppins, sans-serif')
      .style('font-size', '12px')
      .style('fill', '#666');

    // Axis labels
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-family', 'Poppins, sans-serif')
      .style('font-size', '14px')
      .style('fill', '#333')
      .text('Total Bandwidth');

    svg.append('text')
      .attr('transform', 'translate(' + (width / 2) + ' ,' + (height + margin.bottom - 10) + ')')
      .style('text-anchor', 'middle')
      .style('font-family', 'Poppins, sans-serif')
      .style('font-size', '14px')
      .style('fill', '#333')
      .text('Day');

    // Grid lines
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
  }

  function renderLegend(epochs) {
    const legendEl = document.getElementById('epoch-legend');
    if (!legendEl) return;

    legendEl.innerHTML = '';

    epochs.forEach((epoch, index) => {
      const color = epochColors[index % epochColors.length];
      const isVisible = epochVisibility[epoch] !== false;

      const legendItem = document.createElement('div');
      legendItem.className = 'epoch-legend-item';
      legendItem.setAttribute('data-epoch', epoch);
      legendItem.style.cssText = `display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 8px; background: ${isVisible ? '#f5f5f5' : '#e0e0e0'}; border-radius: 4px; cursor: pointer; transition: all 0.2s; user-select: none;`;
      legendItem.addEventListener('click', () => toggleEpochVisibility(epoch));
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
      
      const colorBox = document.createElement('div');
      colorBox.style.cssText = `width: 12px; height: 12px; background: ${color}; border-radius: 2px; opacity: ${isVisible ? 1 : 0.3}; flex-shrink: 0;`;
      
      const label = document.createElement('span');
      label.style.cssText = `font-family: Poppins, sans-serif; font-size: 12px; color: ${isVisible ? '#333' : '#999'}; text-decoration: ${isVisible ? 'none' : 'line-through'}; font-weight: 500;`;
      label.textContent = epoch;
      
      legendItem.appendChild(colorBox);
      legendItem.appendChild(label);
      legendEl.appendChild(legendItem);
    });
  }

  function updateLegend() {
    // Re-render legend with data (in case we need to update anything)
    const epochs = bandwidthData.length > 0 
      ? bandwidthData.map(d => d.epoch)
      : [];
    
    if (epochs.length > 0) {
      renderLegend(epochs);
    }
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

    tooltip.html(`
      <div style="margin-bottom: 4px;"><strong>Epoch ${data.epoch}, Day ${data.day}</strong></div>
      <div style="margin-bottom: 2px;">Bandwidth: <strong>${formatBytes(data.total_bandwidth)}</strong></div>
      <div style="margin-bottom: 2px;">Nodes: <strong>${data.node_count}</strong></div>
      <div>Reporting Today: <strong>${data.nodes_reporting_today}</strong></div>
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

