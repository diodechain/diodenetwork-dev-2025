"use strict";

(function() {
  const targetDateStr = "2025-04-24T16:00:00Z";
  const targetDate = new Date(targetDateStr).getTime();
  console.log("Target Date (milliseconds):", targetDate);

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

      const currentUTC = new Date(data.dateTime).getTime();
      console.log("Current UTC from API (ms):", currentUTC);

      let distance = targetDate - currentUTC;
      console.log("Initial Distance to Target Date:", distance);

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

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);


        document.getElementById("days").textContent = String(days).padStart(2, "0");
        document.getElementById("hours").textContent = String(hours).padStart(2, "0");
        document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
        document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
      }, 1000);
    })
    .catch((error) => {
      console.error("Error fetching current UTC time from TimeAPI:", error);
    });
})();
