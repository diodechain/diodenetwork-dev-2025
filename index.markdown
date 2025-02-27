---
layout: default
title: "Home"
---

<!-- HERO SECTION -->
<div id="hero-section" class="hero-section">

  <a href="{{ '/wallet/' | relative_url }}" class="launch-app-btn">Launch App</a>
  <h1 class="hero-heading">Web3 Zero Trust Networking</h1>
  <p class="hero-subtext">
  The Diode Network is the leading open and permissionless Zero Trust network.
  </p>
</div>

<!-- NETWORK MAP SECTION (Network.vue component) -->
<div id="network-map-section">
  <div id="app">
    <dashboard></dashboard>
  </div>
</div>

<!-- TECHNOLOGY SECTION -->
<div id="technology-section">
  {% include technology.html %}
</div>

{% include footer.html %}
