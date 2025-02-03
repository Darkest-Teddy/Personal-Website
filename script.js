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
  element.style.display = "none"
}

function openWindow(element) {
    element.style.display = "flex"
  }
var welcomeScreenClose = document.querySelector("#welcomeclose")

var welcomeScreenOpen = document.querySelector("#welcomeopen")

welcomeScreenClose.addEventListener("click", function() {
    closeWindow(welcomeScreen);
  });
  
  welcomeScreenOpen.addEventListener("click", function() {
    openWindow(welcomeScreen);
  });