---
layout: default
title: "Home"
---

<!-- HERO SECTION -->
<div id="hero-section" class="hero-section">
  
  <div class="hero-button-container">
    <a href="{{ '/wallet/' | relative_url }}" class="launch-app-btn">Points App</a>
    <a href="{{ 'https://network.docs.diode.io/docs' }}" target="_blank" class="launch-node-btn">Run a Node</a>
  </div>

  <h1 class="hero-heading">Not your keys, not your data</h1>
  <p class="hero-subtext">
    <br>
    The Diode Network is the leading open and permissionless zero trust network.
    <br><br>
    Not only is it more secure than traditional ZTNAs, it delivers communication for the price of bandwidth.  
  </p>
  <a href="#network-map-section" class="scroll-down-arrow-hero">
    <img src="{{ '/assets/images/icons/arrow_back_white.svg' | relative_url }}" alt="Scroll Down" width="50" height="50" >
  </a>
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
<script src="{{ '/assets/js/countdown.js' | relative_url }}"></script>