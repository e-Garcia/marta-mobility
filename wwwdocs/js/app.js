var context = {}; // context object holds data accessible to handlebars
var firstBooking = null;
var bell = null;

document.querySelector('#login').addEventListener('click', function() {
  var username = document.querySelector('input[name=providedUsername]').value;
  var password = document.querySelector('input[name=providedPassword]').value;

  getTrips(username, password);

});


document.querySelector('#pw').addEventListener('keyup', function(event) {
  if (event.keyCode == 13) {
    var username = document.querySelector('input[name=providedUsername]').value;
    var password = document.querySelector('input[name=providedPassword]').value;

    getTrips(username, password);

  }
});


function getTrips(username, password) {
  document.querySelector('#output').innerHTML = '<center><div id="spinner"></div></center>';

  return new Promise(function(resolve, reject) {

    var xhr = new XMLHttpRequest();
    xhr.open('POST', "./api/index.php", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onload = function() {
      if (xhr.readyState == 4 && xhr.status === 200) {


        resolve(addMartaDataToDom(xhr.responseText));


      } else {

        reject(Error('Request failed, status was ' + xhr.statusText));

      }
    };
    xhr.send("providedUsername=" + username + "&providedPassword=" + password);
  });

}

// this function starts listening to firebase after data has been retrieved from the MARTA site.
function addMartaDataToDom(xhrResponse) {

  var proceed = true;

  // my first ever try/catch & I'm definitely doing it wrong ;)
  try {
    context['dataFromMarta'] = JSON.parse(xhrResponse);
  } catch (err) {
    console.log("error: " + err);
    proceed = false;
  }

  if (proceed) {
    pushHandlebars();
    document.querySelector('#unpw-form').classList.add("hidden");
    document.querySelector('#login').classList.add("hidden");
    listenToFirebase();
  } else {
    document.querySelector('#output').innerHTML = '<br><br><Br><span style="color:#ff7e72">Client ID or password not found.</span>';
  }


}

function pushHandlebars() {
  window.scrollTo(0, 0);
  var source = document.querySelector("#entry-template").innerHTML;
  var template = Handlebars.compile(source);
  var html = template(context);
  document.querySelector('#output').innerHTML = html;

  firstBooking = context.dataFromMarta[0].bookings[0];
  checkDelay(firstBooking.endWindow, firstBooking.eta);
  addListeners();
  gaugeSetup();
}

function addListeners() {

  bell = document.querySelector('.bell');

  document.querySelector('#refresh').addEventListener('click', function() {
    var username = document.querySelector('input[name=providedUsername]').value;
    var password = document.querySelector('input[name=providedPassword]').value;

    getTrips(username, password);

  });

  for (var i = 0; i < context.dataFromMarta[0].bookings.length; i++) {

    var detailsID = "#details" + i;
    var locationsID = "#locations" + i;
    (function handleDetails(detailsID, locationsID) {
      document.querySelector(detailsID).addEventListener("click", function() {
        if (document.querySelector(locationsID).style.display !== "block") {
          this.innerHTML = '<i class="fa fa-chevron-up" aria-hidden="true"></i>';
          document.querySelector(locationsID).style.display = "block";

        } else {
          this.innerHTML = '<i class="fa fa-chevron-down" aria-hidden="true"></i>';
          document.querySelector(locationsID).style.display = "none";
        }
      });
    })(detailsID, locationsID); // this weird IIFE patter locks in the "i" from the iterator.

  }
}




function checkDelay(windowEnd, eta) {

  var etaField = document.querySelector('.eta');
  var lateSatusField = document.querySelector('span.late-status');
  var bookedTracker = document.querySelector('.booked');
  var fiveMinuteTracker = document.querySelector('.five-minutes');
  var scheduledTracker = document.querySelector('.scheduled');
  var tripSoonTracker = document.querySelector('.trip-soon');
  var hereNowTracker = document.querySelector('.here-now');

  var now = new Date(); // for now
  var nowInMinutes = (now.getHours() * 60) + now.getMinutes();

  completeStep(bookedTracker, "Booked");

  // if no ETA, change color and do nothing else
  if (!eta) {
    etaField.style.backgroundColor = "lightblue";
    return;
  }

  // but if we have an ETA, it means a bus is scheduled, so we can work with it.
  completeStep(scheduledTracker, "Van assigned");

  var theEtaInMinutes = convertTimeToMinutes(eta);
  var windowEndInMinutes = convertTimeToMinutes(windowEnd);

  var timeFromNow = theEtaInMinutes - nowInMinutes;
  console.log(timeFromNow);

  if (timeFromNow <= 5 && timeFromNow > 0) {
    completeStep(fiveMinuteTracker, "5 min. away");
  }

  if (timeFromNow <= 30 && timeFromNow > 0) {
    completeStep(tripSoonTracker, "30 min. away");
  }

  if (timeFromNow <= 0 && timeFromNow > -10) {
    completeStep(hereNowTracker, "Arriving now!");

  }


  if (theEtaInMinutes > windowEndInMinutes) {
    //        etaField.style.backgroundColor = "#ff7e72";
    lateSatusField.textContent = ", running late.";

  } else if (theEtaInMinutes <= windowEndInMinutes && windowEndInMinutes - theEtaInMinutes < 30) {
    //        etaField.style.backgroundColor = '#f8efc0';
    lateSatusField.textContent = ", arriving in window.";
  } else {
    //        etaField.style.backgroundColor = 'darkseagreen';
    lateSatusField.textContent = ", arriving on time.";
  }


}

function completeStep(trackerElement, requiredText) {
  trackerElement.classList.remove('future-step');
  trackerElement.classList.add('complete');
  trackerElement.setAttribute('data-text', requiredText);

  if (requiredText === "Arriving now!") {
    bell.classList.add('bell-shake');
  }

}

function convertTimeToMinutes(time) {

  var timeInMinutes = time.split(":");
  timeInMinutes = (timeInMinutes[0] * 60) + parseInt(timeInMinutes[1]);
  return timeInMinutes;
}

/* clearly this function is where I have fallen in love with ternary expressions
but do they make it less clear?
*/
function convertTimeFromMinutes(minutes) {

  var minuteSegment = minutes % 60;

  //adding the leading zero if needed.
  minuteSegment = minuteSegment < 10 ? "0" + minuteSegment : minuteSegment;
  var hourSegment = (minutes - minuteSegment)/60;
  var amPm = hourSegment < 12 ? "AM" : "PM";
  var convertedHour = hourSegment < 12 ? hourSegment : hourSegment % 12;

  return convertedHour + ":" + minuteSegment + " " + amPm;
}


var database = firebase.database();
var etaRef = database.ref('eta-from-marta');
var modifierRef = database.ref('eta-modifier');
var dbResults = {};


function listenToFirebase () {

  modifierRef.on("value", function(snapshot){
    dbResults.modifier = snapshot.val();
    if (dbResults.etaFromMarta && g1) {
    combineDelays();
    }
  });

  etaRef.on("value", function(snapshot) {

  dbResults.etaFromMarta = snapshot.val();
  combineDelays()

});

 }


function combineDelays () {
  var theEtaInMinutes = convertTimeToMinutes(dbResults.etaFromMarta);
  var windowEndInMinutes = convertTimeToMinutes(firstBooking.endWindow);

  var newDelay = 30 - (windowEndInMinutes - theEtaInMinutes);
  if (dbResults.modifier) {
    newDelay += dbResults.modifier;
  }
  dbResults.combinedDelay = newDelay;
  dbResults.newETA = convertTimeFromMinutes(theEtaInMinutes + dbResults.modifier);

  if (g1){
  g1.refresh(newDelay + 30);
  }
  else {
    gaugeSetup(newDelay + 30);
  }

  checkDelay(firstBooking.endWindow, dbResults.newETA);

  console.log("theEtaInMinutes: " + theEtaInMinutes +
    " windowEndInMinutes: " + windowEndInMinutes + " newDelay:" + newDelay);
}


// guage script!
var g1; // global for development

function gaugeSetup(time) {

  var theEtaInMinutes = time || convertTimeToMinutes(firstBooking.eta);
  var windowEndInMinutes = convertTimeToMinutes(firstBooking.endWindow);
  var delay = 30 - (windowEndInMinutes - theEtaInMinutes);
  var earlyTime = convertTimeFromMinutes(windowEndInMinutes - 60);

  function convertToTime() {
    return dbResults.newETA;
  }


  g1 = new JustGage({
    id: "g1",
    value: delay,
    min: 0,
    max: 60,
    minTxt: earlyTime,
    maxTxt: firstBooking["displayEndWindow"],
    textRenderer: convertToTime,
    label: "ETA",
    donut: false,
    pointer: true,
    pointerOptions: {
      toplength: -15,
      bottomlength: 10,
      bottomwidth: 12,
      color: '#222',
      stroke: '#ffffff',
      stroke_width: 3,
      stroke_linecap: 'round'
    },
    gaugeWidthScale: 0.7,
    counter: true,
    valueFontSize: 10,
    noGradient: true,
    customSectors: {
      ranges: [{
          color: "#C9E5BD",
          lo: 0,
          hi: 30
        }, {
          color: "#F8EFC0",
          lo: 31,
          hi: 59,
        },
        {
          color: "#ff3b30",
          lo: 60,
          hi: 720,
        }
      ]
    }
  });

// mess with var lirbrary defaults
var texts = document.querySelectorAll("text");

texts.forEach(function(element){
  element.setAttribute("fill", "#000");
});

var valueLabel = document.querySelector("#g1 > svg > text:nth-child(7)");
valueLabel.setAttribute("y", "100");

}