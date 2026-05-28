let channelsData = [];
let groupedChannels = {};
let currentHls = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Fetch the playlist.m3u file dynamically
    fetch('playlist.m3u')
        .then(response => {
            if (!response.ok) throw new Error("Playlist not found");
            return response.text();
        })
        .then(data => {
            parseM3U(data);
            renderCategories();
        })
        .catch(error => {
            console.error("Error:", error);
            document.getElementById('nowPlaying').innerText = "Error: Make sure playlist.m3u is in the same folder.";
        });
});

// 2. Parse the text from playlist.m3u
function parseM3U(data) {
    const lines = data.split('\n');
    let currentChannel = {};

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
            const groupMatch = line.match(/group-title="([^"]+)"/i);
            currentChannel.group = groupMatch ? groupMatch[1] : 'Uncategorized';
            
            const splitByComma = line.split(',');
            currentChannel.name = splitByComma.length > 1 ? splitByComma.pop().trim() : 'Unknown Channel';
            
        } else if (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('acestream')) {
            currentChannel.url = line;
            channelsData.push({...currentChannel});
            currentChannel = {}; 
        }
    }
    groupChannelsByCategory();
}

// 3. Group them for the sidebar
function groupChannelsByCategory() {
    channelsData.forEach(channel => {
        if (!groupedChannels[channel.group]) {
            groupedChannels[channel.group] = [];
        }
        groupedChannels[channel.group].push(channel);
    });
}

// 4. Render the categories
function renderCategories() {
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = ''; 
    const categories = Object.keys(groupedChannels).sort();

    categories.forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.innerText = `${cat} (${groupedChannels[cat].length})`;
        btn.onclick = () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderChannels(cat);
        };
        categoryList.appendChild(btn);

        // Click the first category automatically
        if (index === 0) btn.click();
    });
}

// 5. Render the channels
function renderChannels(categoryName) {
    const channelList = document.getElementById('channelList');
    channelList.innerHTML = ''; 

    const channels = groupedChannels[categoryName] || [];

    channels.forEach(channel => {
        const card = document.createElement('div');
        card.className = 'channel-card';
        card.innerHTML = `<div class="channel-title">${channel.name}</div>`;
        
        // Pass the raw IP link to the player when clicked
        card.onclick = () => playStream(channel.url, channel.name);
        channelList.appendChild(card);
    });
}

// 6. Push the IP link into HLS.js
function playStream(url, channelName) {
    const video = document.getElementById('videoPlayer');
    document.getElementById('nowPlaying').innerText = `Playing: ${channelName}`;

    if (currentHls) {
        currentHls.destroy();
    }

    if (Hls.isSupported() && (url.includes('.m3u8') || url.includes('/PLTV/'))) {
        currentHls = new Hls();
        currentHls.loadSource(url);
        currentHls.attachMedia(video);
        currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.log("Playback interaction required"));
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || url.toLowerCase().endsWith('.mp4')) {
        video.src = url;
        video.play().catch(e => console.log("Playback interaction required"));
    } else {
        alert("This specific stream format might not play directly in standard browsers without a proxy.");
    }
              }

