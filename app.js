// app.js

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Routes

// Render the main page
app.get('/calendar', (req, res) => {
  res.render('calendar');
});

// Fetch events for a specific date
app.get('/events', async (req, res) => {
  const date = req.query.date;

  try {
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.where('date', '==', date).get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const events = [];
    snapshot.forEach(doc => {
      events.push(doc.data());
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Fetch available times for a specific date
app.get('/available-times', async (req, res) => {
  const date = req.query.date;

  try {
    // Define all possible times between 08:00 and 17:00 in 30-minute intervals
    const allTimes = [];
    for (let hour = 8; hour <= 16; hour++) {
      ['00', '30'].forEach(minute => {
        let time = ('0' + hour).slice(-2) + ':' + minute;
        allTimes.push(time);
      });
    }
    // Add 17:00 separately
    allTimes.push('17:00');

    // Fetch booked times for the date
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.where('date', '==', date).get();

    const bookedTimes = [];
    snapshot.forEach(doc => {
      bookedTimes.push(doc.data().time);
    });

    // Filter out booked times
    const availableTimes = allTimes.filter(time => !bookedTimes.includes(time));

    res.json(availableTimes);
  } catch (error) {
    console.error('Error fetching available times:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Add a new event
app.post('/add-event', async (req, res) => {
  const { date, clientName, service, time } = req.body;

  try {
    // Check if the time slot is available
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef
      .where('date', '==', date)
      .where('time', '==', time)
      .get();

    if (!snapshot.empty) {
      // Time slot is occupied
      return res.json({ success: false, error: 'Time slot occupied' });
    }

    const eventData = {
      date,
      clientName,
      service,
      time,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('events').add(eventData);

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding event:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Fetch bookings summary for date range
app.get('/bookings-summary', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    const bookings = {};

    snapshot.forEach(doc => {
      const event = doc.data();
      const date = event.date;

      if (!bookings[date]) {
        bookings[date] = 1;
      } else {
        bookings[date]++;
      }
    });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings summary:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
