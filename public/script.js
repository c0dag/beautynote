// public/script.js

document.addEventListener('DOMContentLoaded', function() {
    // Get today's date in 'YYYY-MM-DD' format
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = ('0' + (today.getMonth() + 1)).slice(-2);
    var dd = ('0' + today.getDate()).slice(-2);
    var todayStr = yyyy + '-' + mm + '-' + dd;
  
    var selectedDate = todayStr; // Initialize selectedDate to today
    var bookingsSummary = {}; // Stores booking counts per day
  
    var calendarEl = document.getElementById('calendar');
  
    var calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      datesSet: function(info) {
        // Fetch booking summary when the date range changes
        fetchBookingsSummary(info.startStr, info.endStr);
      },
      dayCellDidMount: function(cellInfo) {
        // Style the day cell based on booking status
        styleDayCell(cellInfo);
      },
      dateClick: function(info) {
        // Handle the selected day styling
        handleDateClick(info);
      }
    });
  
    calendar.render();
  
    // Fetch events for the selected date (today)
    fetchEvents(selectedDate);
  
    // Function to fetch bookings summary and then re-style day cells
    function fetchBookingsSummary(startDate, endDate) {
      fetch(`/bookings-summary?startDate=${startDate}&endDate=${endDate}`)
        .then(response => response.json())
        .then(data => {
          bookingsSummary = data;
  
          // Re-style all day cells
          var dayCells = document.querySelectorAll('.fc-daygrid-day');
          dayCells.forEach(function(dayCell) {
            var dateStr = dayCell.getAttribute('data-date');
            styleDayCell({ dateStr: dateStr, el: dayCell });
          });
        });
    }
  
    function styleDayCell(cellInfo) {
      var dateStr = cellInfo.dateStr;
      var dayEl = cellInfo.el; // The DOM element of the day cell
  
      // Remove any existing status classes
      dayEl.classList.remove('free-day', 'partially-booked-day', 'fully-booked-day', 'selected-day');
  
      // Apply the 'selected-day' class only to the selected date
      if (selectedDate && dateStr === selectedDate) {
        dayEl.classList.add('selected-day');
        return; // Skip further styling to keep the selected day blue
      }
  
      // Get the number of bookings for this date
      var bookingsCount = bookingsSummary[dateStr] || 0;
  
      // Define the maximum number of bookings per day (18 slots)
      var maxBookingsPerDay = 18;
  
      // Determine the status of the day
      if (bookingsCount === 0) {
        dayEl.classList.add('free-day');
      } else if (bookingsCount >= maxBookingsPerDay) {
        dayEl.classList.add('fully-booked-day');
      } else {
        dayEl.classList.add('partially-booked-day');
      }
    }
  
    function handleDateClick(info) {
      selectedDate = info.dateStr;
  
      // Re-style all day cells
      var dayCells = document.querySelectorAll('.fc-daygrid-day');
      dayCells.forEach(function(dayCell) {
        var dateStr = dayCell.getAttribute('data-date');
        styleDayCell({ dateStr: dateStr, el: dayCell });
      });
  
      // Fetch events for the selected date
      fetchEvents(selectedDate);
    }
  
    // Fetch events for the selected date
    function fetchEvents(dateStr) {
      fetch('/events?date=' + dateStr)
        .then(response => response.json())
        .then(data => {
          displayEvents(data, dateStr);
        });
    }
  
    // Display events and show the 'Add Event' button
    function displayEvents(events, dateStr) {
      var eventsList = document.getElementById('events-list');
      eventsList.innerHTML = '';
  
      if (events.length > 0) {
        // Sort events by time
        events.sort((a, b) => a.time.localeCompare(b.time));
  
        events.forEach(event => {
          var eventItem = document.createElement('p');
          eventItem.textContent = event.time + ' - ' + event.clientName + ' - ' + event.service;
          eventsList.appendChild(eventItem);
        });
      } else {
        eventsList.innerHTML = '<p>No events for this date.</p>';
      }
  
      document.getElementById('add-event-btn').style.display = 'block';
    }
  
    // Show the event modal and populate time dropdown
    var modal = document.getElementById('event-modal');
    var btn = document.getElementById('add-event-btn');
    var span = document.getElementsByClassName('close')[0];
  
    btn.onclick = function() {
      // Fetch available times before showing the modal
      fetchAvailableTimes(selectedDate);
    };
  
    span.onclick = function() {
      modal.style.display = 'none';
    };
  
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = 'none';
      }
    };
  
    // Fetch available times for the selected date
    function fetchAvailableTimes(dateStr) {
      fetch('/available-times?date=' + dateStr)
        .then(response => response.json())
        .then(data => {
          populateTimeDropdown(data);
          modal.style.display = 'block';
        });
    }
  
    // Populate the time dropdown
    function populateTimeDropdown(times) {
      var timeSelect = document.getElementById('event-time');
      timeSelect.innerHTML = '';
  
      if (times.length > 0) {
        times.forEach(time => {
          var option = document.createElement('option');
          option.value = time;
          option.textContent = time;
          timeSelect.appendChild(option);
        });
      } else {
        var option = document.createElement('option');
        option.value = '';
        option.textContent = 'No available times';
        timeSelect.appendChild(option);
      }
    }
  
    // Handle event form submission
    var form = document.getElementById('event-form');
    form.onsubmit = function(e) {
      e.preventDefault();
  
      var clientName = document.getElementById('client-name').value;
      var service = document.getElementById('service').value;
      var eventTime = document.getElementById('event-time').value;
  
      // Check if time is selected
      if (!eventTime) {
        alert('Please select a time.');
        return;
      }
  
      fetch('/add-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: selectedDate, clientName, service, time: eventTime })
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('Event added successfully!');
            modal.style.display = 'none';
            form.reset();
            fetchEvents(selectedDate);
            // After adding an event, update the booking summary
            fetchBookingsSummary(
              calendar.view.activeStart.toISOString().split('T')[0],
              calendar.view.activeEnd.toISOString().split('T')[0]
            );
          } else if (data.error === 'Time slot occupied') {
            alert('The selected time slot is already occupied. Please choose a different time.');
          } else {
            alert('Failed to add event.');
          }
        });
    };
  });
  