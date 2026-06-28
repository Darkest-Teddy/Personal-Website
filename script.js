// Website clock

function updateTime() {
  var now = new Date();
  var datePart = now.toLocaleDateString();
  var timePart = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  var timeText = document.querySelector("#timeElement");

  timeText.textContent = datePart + "  " + timePart;
}

setInterval(updateTime, 1000);

let zCounter = 10;

const draggableElements = document.querySelectorAll('.window');
draggableElements.forEach(function(element) {
    element.addEventListener('mousedown', function() {
        element.style.zIndex = zCounter++;
    });
    dragElement(element);
});

function dragElement(element) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    // Select the header by class within the current .window
    const header = element.querySelector('.windowheader');
    
    if (header) {
        // If the header is found, set up drag events on the header:
        header.onmousedown = dragMouseDown;
    } else {
        // Otherwise, set up drag events directly on the .window element
        element.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function closeWindow(element) {
    element.style.visibility = "hidden"; // Hides the window but keeps its size
  }
  
  function openWindow(element) {
    element.style.visibility = "visible"; // Makes the window visible again

    if (!element.style.left) {
        positionWindow(element); // Only position on first open
    }
  }
  
  // Select the elements

  // Welcome window variables
  var welcomeScreen = document.querySelector("#welcomeScreen");
  var welcomeScreenOpen = document.querySelector("#welcomeopen");
  var welcomeScreenClose = document.querySelector("#welcomeclose");

  // About Me window variables
  var aboutmeScreen = document.querySelector("#aboutmescreen");
  var aboutmeScreenOpen = document.querySelector("#aboutmeopen");
  var aboutmeScreenClose = document.querySelector("#aboutmeclose");

  // Projects window variables
  var projectsScreen = document.querySelector("#projectsscreen");
  var projectsScreenOpen = document.querySelector("#projectsopen");
  var projectsScreenClose = document.querySelector("#projectsclose");

  // Bank window variables
  var bankScreen = document.querySelector("#bankscreen");
  var bankScreenOpen = document.querySelector("#bankopen");
  var bankScreenClose = document.querySelector("#bankclose");

  // About Me window event listeners
  aboutmeScreenOpen.addEventListener("click", function() {
      openWindow(aboutmeScreen);
  });

  aboutmeScreenClose.addEventListener("click", function() {
      closeWindow(aboutmeScreen);
  });

  // Welcome window event listeners
  welcomeScreenOpen.addEventListener("click", function() {
      openWindow(welcomeScreen);
  });

  welcomeScreenClose.addEventListener("click", function() {
      closeWindow(welcomeScreen);
  });

  // Projects window event listeners
  projectsScreenOpen.addEventListener("click", function() {
      openWindow(projectsScreen);
  });

  projectsScreenClose.addEventListener("click", function() {
      closeWindow(projectsScreen);
  });

  // Bank window event listeners
  const bankErrorSound = new Audio("./sounds/Microsoft Windows 98 Error - QuickSounds (mp3cut.net).mp3");

  bankScreenOpen.addEventListener("click", function() {
      openWindow(bankScreen);
      bankErrorSound.currentTime = 0;
      bankErrorSound.play();
  });

  bankScreenClose.addEventListener("click", function() {
      closeWindow(bankScreen);
  });

    
// Function to adjust window's position to stay within the viewport
function positionWindow(element) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Get the current position and size of the window
    let windowWidth = element.offsetWidth;
    let windowHeight = element.offsetHeight;

    let windowLeft = element.offsetLeft;
    let windowTop = element.offsetTop;

    // Adjust the position if the window is out of bounds
    if (windowLeft + windowWidth > screenWidth) {
      windowLeft = screenWidth - windowWidth; // Keep it within the right side
    }

    if (windowTop + windowHeight > screenHeight) {
      windowTop = screenHeight - windowHeight; // Keep it within the bottom side
    }

    if (windowLeft < 0) {
      windowLeft = 0; // Keep it within the left side
    }

    if (windowTop < 0) {
      windowTop = 0; // Keep it within the top side
    }

    // Set the updated position
    element.style.left = windowLeft + "px";
    element.style.top = windowTop + "px";
  }
