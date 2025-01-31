var Network = {
    name: "network",
    delimiters: ["<%", "%>"],
    data: () => {
      return {
        base: "",
        total_nodes: "",
        network: [],
        nodes: {},
        points: {},
        collisionMap: {},
        base: undefined,
        baseIp: undefined,
        timeoutId: null,
        searchTerm: "",
        searchActivated: false,
        searchFinished: false,
        searchResults: [],
      };
    },
  
    created: function () {
      let self = this;
      getBase(function (base) {
        self.base = base;
      });
  
      this.load();
    },
    mounted: function () {
      this.makeDraggable(this.$refs.svg);
    },
    watch: {
      points: function() {
          this.total_nodes = Object.keys(this.points).length + " public, "+ (this.network.length - Object.keys(this.points).length) + " private"
      }
    },
    methods: {
      tooltip(point, event, hovered) {
        let text = "Location: " + (point.city || "Unknown") + " (" + point.ip + ")</br>";
        text += "Version: " + point.version + " </br>";
  
        if (point.last_seen && point.type == "notConnected") text += "Last Seen: " + point.last_seen + "</br>";
        if (point.uptime && point.type != "notConnected") {
          text += "Uptime: " + point.uptime + " / ";
          text += point.retries + " reconnects";
        }
  
        let tooltipContent = `<div class="tooltip-inner">
                                  <a target="_blank" href="${getAddressLink(point.node_id)}">${point.name}</a>
                                  <br>${text}<br>
                                </div>`;
  
        let tooltipLayout = document.getElementById("map-tooltip");
  
        if (tooltipLayout.innerHTML !== tooltipContent) {
          tooltipLayout.innerHTML = tooltipContent;
          let offsetLeft = tooltipLayout.clientWidth > 350 ? 80 : 40;
          // tooltipLayout.style.transform = `translate3d(${event.layerX - offsetLeft}px, ${event.layerY + 80}px, 0px)`;
        }
  
        tooltipLayout.style.display = 'block';
  
        if (this.timeoutId) { clearTimeout(this.timeoutId); }
  
        //if (hovered) {
        if (false) {
          this.timeoutId = setTimeout(function () {
            document.getElementById("map-tooltip").style.display = "none";
          }, 3000);
        }
  
      },
      load: async function () {
        let ret = undefined;
        let base = await web3.eth.getCoinbase();
        this.base = base;
        try {
          ret = await web3.eth.getNode(base);
        } catch (err) {
          console.log("getNode error:", base, err);
          return;
        }
        this.baseIp = ret[1];
        this.putPoint(base, ret, "self", 0);
        try {
          this.network = await web3.eth.network();
        } catch (err) {
          console.log("network error:", err);
          return;
        }
  
        for (entry of this.network) {
          let type = entry.connected ? "connected" : "notConnected";
          this.putPoint(entry.node_id, entry.node, type, entry.retries, entry);
        }
      },
  
      makeDraggable: function (svg) {
        let selectedElement;
        let offset;
        let getMousePosition = function (evt) {
          let CTM = svg.getScreenCTM();
          return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
          };
        }
  
        let startDrag = function (evt) {
  
          if (evt.currentTarget.classList.contains('draggable')) {
            selectedElement = evt.currentTarget;
            offset = getMousePosition(evt);
            offset.x -= parseFloat(selectedElement.getAttributeNS(null, "x"));
            offset.y -= parseFloat(selectedElement.getAttributeNS(null, "y"));
          }
        }
  
        let drag = function (evt) {
          if (selectedElement == evt.currentTarget) {
            evt.preventDefault();
            let coord = getMousePosition(evt);
            let x = coord.x - offset.x;
            let y = coord.y - offset.y;
            selectedElement.setAttributeNS(null, "x", x);
            selectedElement.setAttributeNS(null, "y", y);
            selectedElement.setAttributeNS(null, "transform", "translate(" + x + "," + y + ")");
          }
        }
  
        let endDrag = function (evt) {
          selectedElement = false;
        }
  
        for (let el of document.getElementsByClassName('draggable')) {
          el.addEventListener('mousedown', startDrag);
          el.addEventListener('mousemove', drag);
          el.addEventListener('mouseup', endDrag);
          el.addEventListener('mouseleave', endDrag);
        };
        // svg.addEventListener('mousedown', startDrag);
        // svg.addEventListener('mousemove', drag);
        // svg.addEventListener('mouseup', endDrag);
        // svg.addEventListener('mouseleave', endDrag);
      },
  
      putPoint: function (node_id, serverObj, type, retries, extra) {
        resolveIP(serverObj[1], (location) => {
          let ip = location.ip;
          let lat = Math.round(location.latitude * 1000) / 1000;
          let lon = Math.round(location.longitude * 1000) / 1000;        
          let point = this.mapLatLon(lat, lon);
          point.ip = ip;
          if (serverObj.length > 5) {
            point.version = serverObj[4];
            let extra = {};
            for (let [key, value] of serverObj[5]) {
              extra[key] = value;
            }
            point.tickets = web3.utils.hexToNumberString(extra["tickets"]);
            point.uptime = uptime(Math.floor(web3.utils.hexToNumber(extra["uptime"]) / 1000));
          } else {
            point.version = "ExDiode <= 2.3";
            point.tickets = false;
            point.uptime = false;
          }
          point.type = type;
          point.city = location.city;
          point.node_id = node_id;
          point.name = resolveName(node_id);
          point.retries = web3.utils.hexToNumber(retries);
          if (extra && type == "notConnected") {
            point.last_seen = formatDateTime(extra.last_seen);
          } else {
            point.last_seen = "Now"
          }
  
          let dist = 15;
          let key = Math.floor(point.x / dist) + "+" + Math.floor(point.y / dist);
          if (this.collisionMap[key]) {
            point.x = point.x + Math.cos(this.collisionMap[key]) * dist;
            point.y = point.y + Math.sin(this.collisionMap[key]) * dist;
            this.collisionMap[key] += Math.PI / 2;
          } else {
            this.collisionMap[key] = Math.PI / 2;
          }
  
          this.$set(this.points, ip, point);
        });
      },
      mapLatLon: function (lat, lon) {
        // <metadata>
        //   <views>
        //     <view h="647.825177808" padding="0" w="1000">
        //       <proj flip="auto" id="mercator" lon0="65.3146660706"></proj>
        //       <bbox h="4064.12" w="6283.19" x="-3141.59" y="-2891.13"></bbox>
        //     </view>
        //   </views>
        // </metadata>
        // let lon0 = 65.3146660706;
        let lon0 = 0;
        let RAD = Math.PI / 180;
        let DEG = 180 / Math.PI;
  
        // clipped longitude
        let clon = lon - lon0;
        if (clon < -180) clon += 360;
        else if (clon > 180) clon -= 360;
  
        let lam = RAD * clon;
        let phi = RAD * lat * -1;
        let x = lam * 1000;
        let y = Math.log((1 + Math.sin(phi)) / Math.cos(phi)) * 1000;
  
        let mapHeight = 647;
        let mapWidth = 1000;
  
        x = Math.round(((x + 3141.59) / 6283.19) * mapWidth);
        y = Math.round(((y + 2891.13) / 4064.12) * mapHeight);
  
        return {
          x,
          y,
        };
      }
    },
  };