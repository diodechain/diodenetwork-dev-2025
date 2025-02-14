---
layout: default
title: "Home"
---

<!-- HERO SECTION -->
<div id="hero-section" class="hero-section">

  <a href="{{ '/wallet/' | relative_url }}" class="launch-app-btn">Launch App</a>
  <h1 class="hero-heading">Uncompromising Privacy.</h1>
  <p class="hero-subtext">
    Diode Network delivers privacy-first communication solutions for  <br/> 
    executives, expats, and operations teams, ensuring secure  <br/>
    messaging and remote access across the globe.
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
