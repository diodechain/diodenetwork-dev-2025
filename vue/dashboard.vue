
<template>
  <div id="current-epoch-section" style="background-color: #FAFAFA; min-height:700px; padding-top: 50px;">
    <div class="navbar-epoch">
      <h2 style="margin: 0;">Current Epoch</h2>
      <span style="margin: 0;">Epoch {{ currentEpoch }} Dashboard</span>
    </div>
    <div class="epoch-content">
      <div class="row">
        <div class="col-left" style="margin-bottom: 40px;">
          <div class="row">
            <div class="card">
              <h3 class="epoch-card-title">Epoch Fleets</h3>
              <p class="epoch-card-content">{{ fleets.length }}</p>
            </div>
            <div class="card staked-fleet">
              <h3 class="epoch-card-title">Staked Fleet Balance</h3>
              <p class="epoch-card-content">{{ totalBalance }} DIODE</p>
            </div>
          </div>
          <div class="card total-bandwidth">
            <h3 class="epoch-card-title">TOTAL BANDWIDTH</h3>
            <p class="epoch-card-content">{{ totalScore }}</p>
          </div>
          <div class="card active-fleets">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin-top: 0; font-size: 14px;">ACTIVE FLEETS</h3>
              <button
                style="background-color: black; color: white; width: 90; border: none; padding: 0.5rem 1rem; border-radius: 4px; font-size: 10px"
                @click="loadFleets"
              >
                View All
              </button>
            </div>
            <hr style="border: 0.5px solid #E6E6E6; margin: 8px 0;" />
            <table>
              <thead>
                <tr>
                  <th>FLEET ADDRESS</th>
                  <th>BALANCE</th>
                  <th>SCORE</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="fleet in fleets" :key="fleet.address">
                  <td>{{ formatAddr(fleet.address, 'short') }}</td>
                  <td>{{ valueToBalance(fleet.currentBalance) }}</td>
                  <td>{{ formatNumber(fleet.score) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="col-right">
          <div class="card balance-distribution" style="min-height: 200px;">
            <h3 style="font-size: 14px;">BALANCE DISTRIBUTION</h3>
            <div class="chart-container">
              <div class="percentage-grid">
                <div
                  class="percentage-item"
                  v-for="(slice, i) in pieSlices"
                  :key="i"
                >
                  <span
                    class="color-square"
                    :style="{ backgroundColor: getColor(i) }"
                  ></span>
                  <p class="balance-value">{{ slice.percentage }}%</p>
                </div>
              </div>

              <div class="chart-image"  >
                <svg
                :width="width"
                :height="height"
                style="overflow: visible;"
                >
                <g :transform="'translate(' + (width/2) + ',' + (height/2) + ')'">
                    <path
                    v-for="(slice, index) in pieSlices"
                    :key="index"
                    :d="slice.path"
                    fill="none"
                    :stroke="getColor(index)"
                    :stroke-width="15"
                    @mouseover="showTooltip($event, slice)"
                    @mouseout="hideTooltip()"
                    />
                </g>
                </svg>


                <div
                  class="tooltip"
                  v-show="tooltipVisible"
                  :style="tooltipStyle"
                >
                  {{ tooltipContent }}
                </div>
              </div>
            </div>
          </div>

          <div class="card relay-nodes">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin-top: 0; font-size: 14px;">RELAY NODES</h3>
              <button
                style="background-color: black; color: white; width: 90; border: none; padding: 0.5rem 1rem; border-radius: 4px; font-size: 10px"
                @click="loadRelays"
              >
                View All
              </button>
            </div>
            <hr style="border: 0.5px solid #E6E6E6; margin: 8px 0;" />
            <table>
              <thead>
                <tr>
                  <th>RELAY NODE ADDRESS</th>
                  <th>TOTAL EARNINGS</th>
                  <th>FLEET SCORE</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="relay in relays" :key="relay.address">
                  <td>{{ formatAddr(relay.address, 'short') }}</td>
                  <td>{{ valueToBalance(relay.rewards) }}</td>
                  <td>{{ formatNumber(relay.fleetScores[0]?.score) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "EpochDashboard",
  data() {
    return {
      fleets: [],
      relays: [],
      totalBalance: 0,
      totalScore: 0,
      currentEpoch: "...",
      width: 200,
      height: 120,
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
      tooltipVisible: false,
      tooltipStyle: {
        left: "0px",
        top: "30px"
      },
      tooltipContent: "",
      colors: [
        "#FF6B6B","#4ECDC4","#45B7D1","#96CEB4",
        "#FFEEAD","#D4A5A5","#9B59B6","#3498DB"
      ]
    };
  },

  computed: {
    pieSlices() {
      const total = this.fleets.reduce((sum, fleet) =>
        sum + parseFloat(web3.utils.fromWei(fleet.currentBalance)), 
      0);

      let startAngle = 0;
      return this.fleets.map((fleet) => {
        const value = parseFloat(web3.utils.fromWei(fleet.currentBalance));
        const angle = (value / total) * Math.PI * 2;

        const path = this.calculateArcPath(startAngle, startAngle + angle);
        startAngle += angle;

        return {
          path: path,
          fleet: fleet,
          percentage: ((value / total) * 100).toFixed(1)
        };
      });
    }
  },

  async created() {
    await this.loadData();
  },

  methods: {
    async loadData() {
      try {
        this.currentEpoch = await CallRegistry("Epoch", []);
        await this.loadFleets();
        await this.loadRelays();
      } catch (error) {
        console.error("Error loading data:", error);
      }
    },

    async loadFleets() {
      try {
        const fleetAddresses = await CallRegistry("FleetArray", []);
        const fleetDetails = await Promise.all(
          fleetAddresses.map((address) => CallRegistry("GetFleet", [address]))
        );

        this.fleets = fleetDetails.map((fleet, index) => ({
          address: fleetAddresses[index],
          currentBalance: fleet.currentBalance,
          score: fleet.score
        }));

        this.totalBalance = this.fleets.reduce(
          (sum, fleet) => sum + parseFloat(web3.utils.fromWei(fleet.currentBalance)), 
          0
        );
        this.totalScore = this.fleets.reduce(
          (sum, fleet) => sum + parseInt(fleet.score), 
          0
        );
      } catch (error) {
        console.error("Error loading fleets:", error);
      }
    },

    async loadRelays() {
      try {
        const relayAddresses = await CallRegistry("RelayArray", []);
        this.relays = await Promise.all(
          relayAddresses.map(async (address) => {
            const rewards = await CallRegistry("RelayRewards", [address]);
            return {
              address,
              rewards,
              fleetScores: [{ score: "0" }] 
            };
          })
        );
      } catch (error) {
        console.error("Error loading relays:", error);
      }
    },

    calculateArcPath(startAngle, endAngle) {
      const radius = Math.min(this.width, this.height) / 2;

      // Arc start
      const x1 = radius * Math.cos(startAngle);
      const y1 = radius * Math.sin(startAngle);
      // Arc end
      const x2 = radius * Math.cos(endAngle);
      const y2 = radius * Math.sin(endAngle);

      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

      // "A" draws an elliptical arc
      return `M ${x1} ${y1}
              A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
    },

    getColor(index) {
      return this.colors[index % this.colors.length];
    },

    showTooltip(event, slice) {
      this.tooltipStyle = {
        left: `${event.clientX + 10}px`,
        top: `${event.clientY + 10}px`
      };
      this.tooltipContent = `${slice.fleet.address.slice(0,6)}... - ${slice.percentage}%`;
      this.tooltipVisible = true;
    },

    hideTooltip() {
      this.tooltipVisible = false;
    },

    formatAddr(addr, mode) {
      if (mode === "short") {
        return `${addr.slice(0,6)}...${addr.slice(-4)}`;
      }
      return addr;
    },

    valueToBalance(value) {
      return `${web3.utils.fromWei(value)} DIO`;
    },

   formatNumber(num) {
  let numStr = num.toString();
  if (numStr.length > 24) {
    numStr = numStr.slice(0, 24);
  }
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

  }
};
</script>

<style scoped>
.tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
}

.chart-container {
  display: flex;
  gap: 20px;
}

.percentage-grid {
  display: flex;
  flex-wrap: wrap;
  width: 120px;
  gap: 10px;
}

.percentage-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-square {
  width: 12px;
  height: 12px;
}

.balance-value {
  font-size: 14px;
}
</style>
