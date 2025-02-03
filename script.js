function updateTime() {
  var currentTime = new Date().toLocaleString();

  var timeText = document.querySelector("#timeElement");

  timeText.innerHTML = currentTime
}

setInterval(updateTime, 1000);

const draggableElements = document.querySelectorAll('.window');
draggableElements.forEach(function(element) {
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

    positionWindow(element);
  }
  
  // Select the elements
  var welcomeScreen = document.querySelector("#welcomeScreen");
  var welcomeScreenClose = document.querySelector("#welcomeclose");
  var welcomeScreenOpen = document.querySelector("#welcomeopen");
  
  // Add event listeners
  welcomeScreenClose.addEventListener("click", function() {
      closeWindow(welcomeScreen);
  });
    
  welcomeScreenOpen.addEventListener("click", function() {
      openWindow(welcomeScreen);
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