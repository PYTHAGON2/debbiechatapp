// Debbie Chatbox Core Logic (ES5 for old browsers)

var SUPABASE_URL = "https://bbgooykuxvyitfxdlilu.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZ29veWt1eHZ5aXRmeGRsaWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODIzNzIsImV4cCI6MjA4ODc1ODM3Mn0.czABaM3GIMJ17bzNANw44Uy5w9fHrXHOwbiSmEIQ3wE";
var TABLE_NAME = "messages";

var currentIp = "Unknown IP";
var currentDevice = "Unknown Device";

var loadCount = 4;

// Initialize
window.onload = function () {
    checkNightMode();
    fetchIpAndDevice();

    // Fetch initial messages on load
    setTimeout(function () {
        loadMessages(loadCount);
    }, 500); // small delay to allow ip fetch to start, though loadMessages won't use it directly

    var btnRefresh = document.getElementById("btn-refresh");
    if (btnRefresh) {
        btnRefresh.onclick = function () {
            loadMessages(loadCount);
        };
    }

    document.getElementById("btn-load").onclick = function () {
        var input = prompt("How many messages to load?", loadCount.toString());
        if (input !== null && !isNaN(parseInt(input, 10)) && parseInt(input, 10) > 0) {
            loadCount = parseInt(input, 10);
            loadMessages(loadCount);
        }
    };

    document.getElementById("btn-clear").onclick = function () {
        document.getElementById("chat-container").innerHTML = "";
    };

    document.getElementById("btn-night").onclick = function () {
        document.body.className = document.body.className === "night" ? "" : "night";
    };
};

function checkNightMode() {
    var hour = new Date().getHours();
    // Night activated between 18:00 and 06:00
    if (hour >= 18 || hour < 6) {
        document.body.className = "night";
    }
}

function fetchIpAndDevice() {
    // Simple User Agent sniffing for old browsers
    var ua = navigator.userAgent;
    if (ua.indexOf("Opera Mini") > -1) currentDevice = "Opera Mini";
    else if (ua.indexOf("iPhone") > -1) currentDevice = "iPhone";
    else if (ua.indexOf("Android") > -1) currentDevice = "Android";
    else if (ua.indexOf("Windows Phone") > -1) currentDevice = "Windows Phone";
    else currentDevice = "Web Browser";

    // Try to get IP address (using a free API, if XHR fails, default is kept)
    // Warning: Old browsers might have CORS issues. We use JSONP if needed, but lets try standard XMLHTTPRequest first.
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api.ipify.org?format=json", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            try {
                // simple json parse fallback
                var res = xhr.responseText;
                var match = res.match(/"ip":\s*"([^"]+)"/);
                if (match && match[1]) {
                    currentIp = match[1];
                }
            } catch (e) { }
        }
    };
    try {
        xhr.send();
    } catch (e) { }
}

function addText(text) {
    var input = document.getElementById("msg-input");
    input.value += text;
    input.focus();
}

function parseMarkup(text) {
    // Escape HTML to prevent XSS (very basic)
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Simple *bold* and _italic_
    text = text.replace(/\*([^\*]+)\*/g, "<b>$1</b>");
    text = text.replace(/_([^_]+)_/g, "<i>$1</i>");
    return text;
}

function stringToColor(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Convert hash to a 360 degree hue
    var hue = Math.abs(hash) % 360;
    // Return a cute pastel color (using HSL mapping directly in style attributes)
    return "hsl(" + hue + ", 80%, 65%)";
}

function renderMessage(msg) {
    var container = document.getElementById("chat-container");

    var div = document.createElement("div");
    div.className = "message";

    // Assign color based on IP
    var ipColor = stringToColor(msg.ip_address || "unknown");
    div.style.borderLeftColor = ipColor;

    var contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.innerHTML = parseMarkup(msg.content || "");

    var subtitleDiv = document.createElement("div");
    subtitleDiv.className = "message-subtitle";

    var dateStr = "Unknown Date";
    if (msg.created_at) {
        var d = new Date(msg.created_at);
        // Add zero padding for old browsers compatibility
        var hr = d.getHours(), min = d.getMinutes();
        dateStr = d.toLocaleDateString() + " " + (hr < 10 ? '0' + hr : hr) + ":" + (min < 10 ? '0' + min : min);
    }

    subtitleDiv.innerHTML = dateStr + " | IP: " + (msg.ip_address || "hidden") + " | " + (msg.device || "unknown");
    // subtitle color hint based on IP
    subtitleDiv.style.color = ipColor;

    div.appendChild(contentDiv);
    div.appendChild(subtitleDiv);

    container.appendChild(div);
}

function loadMessages(limit) {
    if (SUPABASE_URL === "YOUR_SUPABASE_URL_HERE") {
        alert("Please set up Supabase URL and Key in script.js to load real messages.");
        // Mock data for display
        document.getElementById("chat-container").innerHTML = "";
        renderMessage({ content: "Welcome to Debbie Chatbox! *This is bold*", ip_address: "192.168.1.1", device: "Opera Mini", created_at: new Date().toISOString() });
        renderMessage({ content: "It looks super cute! 😊", ip_address: "10.0.0.5", device: "iPhone", created_at: new Date().toISOString() });
        window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
        return;
    }

    var xhr = new XMLHttpRequest();
    // Fetch last N messages, ordered by created_at desc
    var url = SUPABASE_URL + "/rest/v1/" + TABLE_NAME + "?select=*&order=created_at.desc&limit=" + limit;

    xhr.open("GET", url, true);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("Authorization", "Bearer " + SUPABASE_KEY);

    document.getElementById("btn-load").innerHTML = "Loading...";

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            document.getElementById("btn-load").innerHTML = "Load Last <span id='load-count'>" + loadCount + "</span>";
            if (xhr.status == 200) {
                // Clear container first
                document.getElementById("chat-container").innerHTML = "";
                try {
                    // Manual JSON parsing or eval fallback if needed (using eval safely or regex if JSON is missing in super old browsers, but JSON is wide enough for Opera Mini usually)
                    var msgs = window.JSON ? JSON.parse(xhr.responseText) : eval("(" + xhr.responseText + ")");
                    // Reverse to show oldest first
                    for (var i = msgs.length - 1; i >= 0; i--) {
                        renderMessage(msgs[i]);
                    }
                    window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
                } catch (e) {
                    alert("Error parsing messages.");
                }
            } else {
                alert("Failed to load messages.");
            }
        }
    };
    xhr.send();
}

function sendMessage(e) {
    // Prevent form submission redirect
    if (e && e.preventDefault) e.preventDefault();
    else if (window.event) window.event.returnValue = false;

    var input = document.getElementById("msg-input");
    var content = input.value;

    if (!content || content.replace(/^\s+|\s+$/g, '') === "") return false;

    if (SUPABASE_URL === "YOUR_SUPABASE_URL_HERE") {
        // Mock sending
        renderMessage({ content: content, ip_address: currentIp, device: currentDevice, created_at: new Date().toISOString() });
        input.value = "";
        window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
        return false;
    }

    var btn = document.getElementById("btn-send");
    btn.innerHTML = "...";
    btn.disabled = true;

    var xhr = new XMLHttpRequest();
    var url = SUPABASE_URL + "/rest/v1/" + TABLE_NAME;

    xhr.open("POST", url, true);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("Authorization", "Bearer " + SUPABASE_KEY);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Prefer", "return=representation");

    var payload = {
        content: content,
        ip_address: currentIp,
        device: currentDevice
    };

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            btn.innerHTML = "Send";
            btn.disabled = false;

            if (xhr.status == 201 || xhr.status == 200) {
                input.value = "";
                // Attempt to parse and render the returned newly created message
                try {
                    var msgs = window.JSON ? JSON.parse(xhr.responseText) : eval("(" + xhr.responseText + ")");
                    if (msgs && msgs.length > 0) {
                        renderMessage(msgs[0]);
                        window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
                    }
                } catch (e) { }
            } else {
                alert("Failed to send message.");
            }
        }
    };

    var dataStr = window.JSON ? JSON.stringify(payload) : '{"content":"' + content.replace(/"/g, '\\"') + '", "ip_address":"' + currentIp + '", "device":"' + currentDevice + '"}';
    xhr.send(dataStr);

    return false;
}
