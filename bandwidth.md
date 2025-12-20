---
layout: app
title: "Network Bandwidth"
permalink: /bandwidth/
---

<div id="app">
  {% include app/navbar.html %}
  {% include app/epoch-stats-bar.html %}
  
  <div id="bandwidth-content-wrapper" style="background-color: #FAFAFA; height: calc(100vh - 140px); padding: 0; margin-top: 0; display: flex; flex-direction: column; width: 100%;">
    <div style="width: 100%; margin: 0; padding: 20px; flex: 1; display: flex; flex-direction: column; overflow: hidden;">
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
      <div id="bandwidth-content" style="width: 100%;">
        <!-- Stats and Graph Layout -->
        <div style="display: flex; gap: 20px; flex: 1; align-items: flex-start; min-height: 0; width: 100%;">
          <!-- Stats Cards (stacked vertically) -->
          <div style="display: flex; flex-direction: column; gap: 20px; min-width: 300px; flex-shrink: 0;">
            <div class="bandwidth-stat-card" style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="font-family: 'Poppins', sans-serif; font-size: 14px; color: #666; margin-bottom: 8px;">
                Total Bandwidth <span id="total-bandwidth-days">(Loading...)</span>
              </div>
              <div id="total-bandwidth-stat" style="font-family: 'Poppins', sans-serif; font-size: 28px; font-weight: 600; color: #4ECDC4;">
                <span id="total-bandwidth-loading" style="color: #999;">Loading...</span>
              </div>
            </div>
            <div class="bandwidth-stat-card" style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="font-family: 'Poppins', sans-serif; font-size: 14px; color: #666; margin-bottom: 8px;">
                Active Nodes <span id="active-nodes-days">(Loading...)</span>
              </div>
              <div id="active-nodes-stat" style="font-family: 'Poppins', sans-serif; font-size: 28px; font-weight: 600; color: #45B7D1;">
                <span id="active-nodes-loading" style="color: #999;">Loading...</span>
              </div>
            </div>
            
            <!-- Epoch Legend -->
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="font-family: 'Poppins', sans-serif; font-size: 14px; color: #666; margin-bottom: 8px;">
                Epochs (click to toggle)
              </div>
              <div id="epoch-legend" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;"></div>
            </div>
          </div>

          <!-- Graph Container -->
          <div style="background: white; padding: 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); flex: 1; display: flex; flex-direction: column; min-height: 0; min-width: 0; width: 100%;">
            <h2 style="font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 600; color: #333; margin-bottom: 24px; flex-shrink: 0;">
              Bandwidth Over Time
            </h2>
            <div id="bandwidth-chart" style="width: 100%; flex: 1; min-height: 400px; display: flex; align-items: center; justify-content: center; color: #999; font-family: 'Poppins', sans-serif; overflow: hidden;">
              <div id="chart-loading">Loading bandwidth data...</div>
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
  @media (max-width: 768px) {
    #bandwidth-content-wrapper {
      padding: 20px 10px !important;
    }
    #bandwidth-content > div:first-child {
      flex-direction: column !important;
    }
    #bandwidth-content > div:first-child > div:first-child {
      min-width: 100% !important;
    }
    .bandwidth-stat-card {
      min-width: 100% !important;
    }
    #bandwidth-chart {
      overflow-x: auto;
    }
    #bandwidth-chart svg {
      min-width: 800px;
    }
  }
</style>

<script src="{{ '/dist/d3.v3.min.js' | relative_url }}"></script>
<script src="{{ '/assets/js/bandwidth.js' | relative_url }}"></script>
