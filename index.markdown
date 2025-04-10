---
layout: default
title: "Home"
---

<!-- HERO SECTION -->
<div id="hero-section" class="hero-section">
 <!-- Countdown Timer -->
  <div class="countdown-container">
    <div class="countdown-label">$DIODE Token Launch:</div>
    <div id="countdown" class="countdown">
      <div class="countdown-item">
        <span id="days">--</span>
        <span class="countdown-label-sm">Days</span>
      </div>
      <div class="countdown-item">
        <span id="hours">--</span>
        <span class="countdown-label-sm">Hours</span>
      </div>
      <div class="countdown-item">
        <span id="minutes">--</span>
        <span class="countdown-label-sm">Minutes</span>
      </div>
      <div class="countdown-item">
        <span id="seconds">--</span>
        <span class="countdown-label-sm">Seconds</span>
      </div>
    </div>
  </div>
  
  <a href="{{ '/wallet/' | relative_url }}" class="launch-app-btn">Launch App</a>

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