"use strict";

(function() {
  const targetDateStr = "2025-04-24T16:00:00Z"; // This corresponds to 9am PT (16:00 UTC)
  const targetDate = new Date(targetDateStr).getTime();
  
  const initialDifference = targetDate - Date.now();
  if (initialDifference > 0) {
    updateCountdown(initialDifference);
  }

  fetch("https://www.timeapi.io/api/Time/current/zone?timeZone=UTC")
    .then((response) => response.json())
    .then((data) => {
      // data looks like: 
      // {
      //   "year": 2025,
      //   "month": 4,
      //   "day": 10,
      //   "hour": 10,
      //   "minute": 8,
      //   "seconds": 51,
      //   "milliSeconds": 128,
      //   "dateTime": "2025-04-10T10:08:51.1284649",
      //   "timeZone": "UTC",
      //   ...
      // }
      console.log("Current UTC from API:", data);
      
      const currentUTC = Date.UTC(
        data.year,
        data.month - 1, // JavaScript months are 0-11, API returns 1-12
        data.day,
        data.hour,
        data.minute,
        data.seconds,
        data.milliSeconds || 0
      );

      let distance = targetDate - currentUTC;

      const countdownTimer = setInterval(() => {
        distance -= 1000;

        if (distance < 0) {
          clearInterval(countdownTimer);
          const container = document.querySelector(".countdown-container");
          if (container) {
            container.innerHTML = "<div class='countdown-complete'>$DIODE Token LAUNCHED!</div>";
          }
          return;
        }

        updateCountdown(distance);
      }, 1000);
    })
    .catch((error) => {
      console.error("Error fetching current UTC time from TimeAPI:", error);
      
      const fallbackDistance = targetDate - Date.now();
      if (fallbackDistance > 0) {
        updateCountdown(fallbackDistance);
        
        const fallbackTimer = setInterval(() => {
          const newDistance = targetDate - Date.now();
          
          if (newDistance < 0) {
            clearInterval(fallbackTimer);
            const container = document.querySelector(".countdown-container");
            if (container) {
              container.innerHTML = "<div class='countdown-complete'>$DIODE Token LAUNCHED!</div>";
            }
            return;
          }
          
          updateCountdown(newDistance);
        }, 1000);
      }
    });
    
  function updateCountdown(distance) {
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("days").textContent = String(days).padStart(2, "0");
    document.getElementById("hours").textContent = String(hours).padStart(2, "0");
    document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
    document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
  }
})();