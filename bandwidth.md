---
layout: app
title: "Network Bandwidth"
permalink: /bandwidth/
---

<div id="app">
  {% include app/navbar.html %}
  {% include app/epoch-stats-bar.html %}
  
  <div id="bandwidth-content-wrapper" style="background-color: #FAFAFA; height: calc(100vh - 120px); padding: 20px; margin-top: 0; display: flex; flex-direction: column; width: 100%; box-sizing: border-box;">
    <div style="margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
      <!-- Error State -->
      <div id="error-state" style="display: none; text-align: center; padding: 20px; margin-bottom: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="font-family: 'Poppins', sans-serif; color: #e74c3c; font-size: 18px; margin-bottom: 15px;">
          Failed to load bandwidth data. Please try again later.
        </div>
        <button id="retry-btn" style="padding: 12px 24px; background-color: #4ECDC4; color: white; border: none; border-radius: 6px; font-family: 'Poppins', sans-serif; cursor: pointer; font-size: 14px;">
          Retry
        </button>
      </div>

      <!-- Main Content -->
      <div id="bandwidth-content" style="box-sizing: border-box;">
        <!-- Stats and Graph Layout -->
        <div style="display: flex; gap: 20px; flex: 1; align-items: flex-start; min-height: 0; box-sizing: border-box;">
          <!-- Stats Cards (stacked vertically) -->
          <div style="display: flex; flex-direction: column; gap: 20px; min-width: 300px; flex-shrink: 0;">
            <div class="bandwidth-stat-card" style="background: #FAFAFA; border: 1px solid #D73E53; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <div class="card-title" style="padding: 20px 16px; background-color: #ffffff; border-top-left-radius: 10px; border-top-right-radius: 10px; height: 100px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 500; color: #141414; margin-bottom: 8px;">
                  Network Bandwidth <span id="total-bandwidth-days" style="font-size: 12px;">(Loading...)</span>
                </div>
                <div id="total-bandwidth-stat" style="font-family: 'Poppins', sans-serif; font-size: 28px; font-weight: bold; color: #151515; height: 38px; display: flex; align-items: center;">
                  <span id="total-bandwidth-loading" style="color: #999; font-size: 14px;">Loading...</span>
                </div>
              </div>
            </div>
            <div class="bandwidth-stat-card" style="background: #FAFAFA; border: 1px solid #D73E53; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <div class="card-title" style="padding: 20px 16px; background-color: #ffffff; border-top-left-radius: 10px; border-top-right-radius: 10px; height: 100px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 500; color: #141414; margin-bottom: 8px;">
                  Active Nodes <span id="active-nodes-days" style="font-size: 12px;">(Loading...)</span>
                </div>
                <div id="active-nodes-stat" style="font-family: 'Poppins', sans-serif; font-size: 28px; font-weight: bold; color: #151515; height: 38px; display: flex; align-items: center;">
                  <span id="active-nodes-loading" style="color: #999; font-size: 14px;">Loading...</span>
                </div>
              </div>
            </div>
            
            <!-- Epoch Legend -->
            <div class="epoch-legend-box" style="background: #FAFAFA; border: 1px solid #D73E53; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <div class="card-title" style="padding: 20px 16px; background-color: #ffffff; border-top-left-radius: 10px; border-top-right-radius: 10px;">
                <div style="font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 500; color: #141414; margin-bottom: 8px;">
                  Epochs (click to toggle)
                </div>
                <div id="epoch-legend" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;"></div>
              </div>
            </div>
          </div>

          <!-- Graph Container -->
          <div style="background: #FAFAFA; border: 1px solid #D73E53; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden; flex: 1; display: flex; flex-direction: column; min-width: 0; box-sizing: border-box;">
            <div class="card-title" style="padding: 20px 16px 8px 16px; background-color: #ffffff; border-top-left-radius: 10px; border-top-right-radius: 10px; flex-shrink: 0;">
              <div id="chart-title" style="font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 500; color: #141414; margin-bottom: 0; display: flex; align-items: center;">
                Bandwidth
              </div>
            </div>
            <div id="bandwidth-chart" style="width: 100%; padding: 0 16px 20px 16px; display: flex; align-items: center; justify-content: center; color: #999; font-family: 'Poppins', sans-serif; overflow: hidden;">
              <div id="chart-loading" style="font-size: 12px;">Loading bandwidth data...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  {% include app/footer.html %}
</div>

<style>
  #bandwidth-content-wrapper {
    margin-top: 0 !important;
  }
  .dashboard-header {
    margin-bottom: 0 !important;
  }
  /* Chart height: viewport - header (180px) - container padding (20px) - graph title padding (60px) - bottom margin and container spacing (40px) */
  #bandwidth-chart {
    height: calc(100vh - 300px) !important;
    min-height: 200px;
  }
  @media (max-width: 768px) {
    #bandwidth-content-wrapper {
      padding: 20px 10px !important;
      height: auto !important;
      min-height: calc(100vh - 120px);
      overflow-x: hidden;
    }
    #bandwidth-content {
      overflow-x: hidden;
    }
    #bandwidth-content > div:first-child {
      flex-direction: column !important;
      overflow-x: hidden;
      gap: 20px !important;
    }
    /* Stats container - make it row for side-by-side stats */
    #bandwidth-content > div:first-child > div:first-child {
      min-width: 100% !important;
      width: 100% !important;
      box-sizing: border-box;
      flex-direction: row !important;
      flex-wrap: wrap !important;
      gap: 10px !important;
    }
    /* Epochs legend should wrap below stats on mobile */
    .epoch-legend-box {
      flex-basis: 100% !important;
      width: 100% !important;
      min-width: 100% !important;
    }
    #bandwidth-content > div:first-child > div:last-child {
      min-width: 0 !important;
      width: 100% !important;
      overflow-x: hidden;
    }
    #bandwidth-content > div:first-child > div:last-child .card-title {
      padding: 20px 10px 8px 10px !important;
    }
    .bandwidth-stat-card {
      flex: 1 !important;
      min-width: 0 !important;
      box-sizing: border-box;
    }
    .bandwidth-stat-card .card-title {
      padding: 20px 10px !important;
    }
    #bandwidth-chart {
      overflow-x: hidden;
      overflow-y: visible;
      height: 400px !important;
      min-height: 400px;
      width: 100% !important;
      padding: 0 !important;
    }
    #bandwidth-chart svg {
      display: block;
      width: 100% !important;
      max-width: 100% !important;
    }
  }
</style>

<script src="{{ '/dist/d3.v3.min.js' | relative_url }}"></script>
<script src="{{ '/assets/js/bandwidth.js' | relative_url }}"></script>
