const socket = io();

// DOM elements
const home = document.getElementById('home');
// Removed unused: board
const joinBtn = document.getElementById('joinBtn');
const joinForm = document.getElementById('joinForm');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
// Removed unused: roomCode
const userList = document.getElementById('userList');
const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const eraserBtn = document.getElementById('eraserBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toolbar = document.getElementById('toolbar');
const colorPreview = document.getElementById('colorPreview');
const colorBtn = document.getElementById('colorBtn');
const colorPopover = document.getElementById('colorPopover');
const colorSwatches = document.getElementById('colorSwatches');
const penSizePreview = document.getElementById('penSizePreview');
const penSizeBtn = document.getElementById('penSizeBtn');
const penSizePopover = document.getElementById('penSizePopover');
const penSizeRange = document.getElementById('penSizeRange');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const stickyNoteBtn = document.getElementById('stickyNoteBtn');
const imageBtn = document.getElementById('imageBtn');
const multiPageBtn = document.getElementById('multiPageBtn');
// Removed unused: darkModeBtn
const emojiPopover = document.getElementById('emojiPopover');
const chatHeader = document.getElementById('chatHeader');
const clearChatBtn = document.getElementById('clearChatBtn');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const emojiBtn = document.getElementById('emojiBtn');
const typingIndicator = document.getElementById('typingIndicator');
const inviteLink = document.getElementById('inviteLink');
const copyInviteBtn = document.getElementById('copyInviteBtn');
const roomPassword = document.getElementById('roomPassword');
const setPasswordBtn = document.getElementById('setPasswordBtn');
const roleContainer = document.getElementById('roleContainer');
const notificationContainer = document.getElementById('notificationContainer');
const saveLoadExport = document.getElementById('saveLoadExport');
const avatarNicknameModal = document.getElementById('avatarNicknameModal');
const stickyNotes = document.getElementById('stickyNotes');
const whiteboard = document.getElementById('whiteboard');
// Removed unused: whiteboardContainer
const micBtn = document.getElementById('micBtn');
const remoteAudio = document.getElementById('remoteAudio');
const chatArea = document.getElementById('chatArea');
const chatFab = document.getElementById('chatFab');
const chatSidebarToggle = document.getElementById('chatSidebarToggle');
const mainContent = document.querySelector('.main-content');
const sidebarEl = document.querySelector('.sidebar');
const mobileBackdrop = document.getElementById('mobileBackdrop');

let drawing = false;
let last = null;
let roomId = null;
let username = null;
let userColor = null;
let penColor = null;
let penSize = 3;
let erasing = false;
let userColors = {};
let imagesOnCanvas = [];
let draggingImage = null;
let dragOffset = {x:0, y:0};
let resizingImage = null;
let resizeStart = {x:0, y:0, w:0, h:0};
let selectedImage = null;
let lockedImage = null;
let localStream = null;
let peerConnections = {};
let isMicOn = false;
let speakingInterval = null;
let audioContext = null;
let speakingUsers = new Set();
// WebRTC audio track reference (fix mic/voice)
let localAudioTrack = null;
// Stroke tracking for proper undo/redo
let strokeIdCounter = 0;
let activeStrokeId = null;

// Initialize multipage state early to avoid TDZ issues in functions used before join
let pages = [{ snapshot: null, notes: [], images: [], drawings: [] }];
let currentPage = 0;

// Debug: Check for missing DOM elements
[
  ['home', home],
  ['joinBtn', joinBtn],
  ['usernameInput', usernameInput],
  ['roomInput', roomInput],
  ['userList', userList],
  ['chatBox', chatBox],
  ['chatForm', chatForm],
  ['chatInput', chatInput],
  ['canvas', canvas],
  ['colorPicker', colorPicker],
  ['eraserBtn', eraserBtn],
  ['downloadBtn', downloadBtn],
  ['toolbar', toolbar],
  ['colorPreview', colorPreview],
  ['colorBtn', colorBtn],
  ['colorPopover', colorPopover],
  ['colorSwatches', colorSwatches],
  ['penSizePreview', penSizePreview],
  ['penSizeBtn', penSizeBtn],
  ['penSizePopover', penSizePopover],
  ['penSizeRange', penSizeRange],
  ['undoBtn', undoBtn],
  ['redoBtn', redoBtn],
  ['stickyNoteBtn', stickyNoteBtn],
  ['imageBtn', imageBtn],
  ['multiPageBtn', multiPageBtn],
  ['emojiPopover', emojiPopover],
  ['chatHeader', chatHeader],
  ['clearChatBtn', clearChatBtn],
  ['emojiBtn', emojiBtn],
  ['typingIndicator', typingIndicator],
  ['inviteLink', inviteLink],
  ['copyInviteBtn', copyInviteBtn],
  ['roomPassword', roomPassword],
  ['setPasswordBtn', setPasswordBtn],
  ['roleContainer', roleContainer],
  ['notificationContainer', notificationContainer],
  ['saveLoadExport', saveLoadExport],
  ['avatarNicknameModal', avatarNicknameModal],
  ['stickyNotes', stickyNotes],
  ['whiteboard', whiteboard],
  ['micBtn', micBtn],
  ['remoteAudio', remoteAudio],
].forEach(([name, el]) => {
  if (!el) console.error('Missing DOM element:', name);
});

// Generate a random color for each user
function getRandomColor() {
  const colors = [
    '#7c3aed', '#6366f1', '#059669', '#f59e42', '#f43f5e', '#eab308', '#0ea5e9', '#14b8a6', '#f472b6', '#a21caf'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// --- Collapsible Chat ---
function setChatCollapsed(collapsed) {
  if (!chatArea) return;
  chatArea.classList.toggle('collapsed', !!collapsed);
  if (chatToggleBtn) {
    chatToggleBtn.textContent = collapsed ? '⬆️' : '⬇️';
    chatToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  }
  // Redraw after layout height changes to prevent visual loss
  resizeCanvas();
  drawAll();
}
function updateChatFabVisibility() {
  if (!chatFab) return;
  chatFab.style.display = window.innerWidth <= 900 ? '' : 'none';
}
if (chatToggleBtn) {
  chatToggleBtn.onclick = (e) => {
    e.preventDefault();
    setChatCollapsed(!chatArea.classList.contains('collapsed'));
  };
}

// --- Sidebar show/hide (desktop canvas fullscreen) ---
function setSidebarHidden(hidden) {
  if (!mainContent) return;
  mainContent.classList.toggle('sidebar-hidden', !!hidden);
  // accessibility hint
  if (chatSidebarToggle) chatSidebarToggle.setAttribute('aria-pressed', String(!!hidden));
  // Recompute canvas size
  setTimeout(() => { resizeCanvas(); drawAll(); }, 0);
}
if (chatSidebarToggle) {
  chatSidebarToggle.onclick = () => {
    const isHidden = mainContent.classList.contains('sidebar-hidden');
    setSidebarHidden(!isHidden);
  };
}
if (chatFab) {
  chatFab.onclick = () => {
    if (window.innerWidth <= 700) {
      // Open/close bottom drawer
      const open = !document.body.classList.contains('mobile-chat-open');
      document.body.classList.toggle('mobile-chat-open', open);
      if (mobileBackdrop) mobileBackdrop.style.display = open ? 'block' : 'none';
      // Always expand chat content when opening the drawer; collapse when closing
      if (open) {
        setChatCollapsed(false);
      } else {
        setChatCollapsed(true);
      }
    } else {
      const willCollapse = chatArea.classList.contains('collapsed');
      setChatCollapsed(!willCollapse);
    }
  };
}
if (mobileBackdrop) {
  mobileBackdrop.onclick = () => {
    document.body.classList.remove('mobile-chat-open');
    mobileBackdrop.style.display = 'none';
  };
}

// Clear chat
if (clearChatBtn) {
  clearChatBtn.onclick = () => { chatBox.innerHTML = ''; };
}

// Responsive canvas
function resizeCanvas() {
  // Set canvas size to match the displayed size with robust fallbacks
  const area = document.querySelector('.canvas-area');
  let width, height;
  if (area) {
    const rect = area.getBoundingClientRect();
    const toolbarEl = document.querySelector('.toolbar');
    const pageNavEl = document.getElementById('pageNav');
    const headerSpace = (toolbarEl ? toolbarEl.getBoundingClientRect().height + 16 : 0)
      + (pageNavEl ? pageNavEl.getBoundingClientRect().height + 12 : 0);
    width = Math.max(0, Math.floor(rect.width));
    // If the area has no height yet (e.g., flex sizing), fallback to viewport
    height = Math.floor(rect.height || (window.innerHeight - headerSpace - 48));
  } else {
    width = window.innerWidth - 340;
    height = window.innerHeight - 80;
  }
  // Enforce sensible minimums so the canvas never collapses
  canvas.width = Math.max(300, width || 0);
  canvas.height = Math.max(300, height || 0);
}
window.addEventListener('resize', resizeCanvas);
// ResizeObserver for smoother canvas resize when layout changes
try {
  const area = document.querySelector('.canvas-area');
  if (window.ResizeObserver && area) {
    const ro = new ResizeObserver(() => {
      resizeCanvas();
      drawAll();
    });
    ro.observe(area);
  }
} catch (_) {}

// Initialize UI on load
window.addEventListener('DOMContentLoaded', () => {
  // Ensure name field starts empty and browsers don't autofill
  if (usernameInput) {
    usernameInput.value = '';
    usernameInput.setAttribute('autocomplete', 'off');
    usernameInput.setAttribute('autocapitalize', 'off');
    usernameInput.setAttribute('autocorrect', 'off');
    usernameInput.setAttribute('spellcheck', 'false');
  }
  // Ensure canvas has correct size before any drawing
  resizeCanvas();
  // Default: open chat panel on load
  setChatCollapsed(false);
  updateChatFabVisibility();
  // Default: show sidebar; user can hide it via toggle for full-width canvas
  setSidebarHidden(false);
});

// Drawing events (use precise mouse-to-canvas mapping)
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}
canvas.addEventListener('mousedown', (e) => {
  const mouse = getCanvasCoords(e);
  if (lockedImage) {
    selectedImage = null;
    drawAll();
    drawing = true;
    last = getCanvasCoords(e);
    activeStrokeId = ++strokeIdCounter;
    return;
  }
  let found = false;
  for (let i = imagesOnCanvas.length - 1; i >= 0; i--) {
    const img = imagesOnCanvas[i];
    if (
      mouse.x > img.x + img.w - 12 && mouse.x < img.x + img.w + 8 &&
      mouse.y > img.y + img.h - 12 && mouse.y < img.y + img.h + 8
    ) {
      selectedImage = img;
      resizingImage = img;
      resizeStart = {x: mouse.x, y: mouse.y, w: img.w, h: img.h};
      found = true;
      drawAll();
      return;
    }
    if (
      mouse.x > img.x && mouse.x < img.x + img.w &&
      mouse.y > img.y && mouse.y < img.y + img.h
    ) {
      selectedImage = img;
      draggingImage = img;
      dragOffset = {x: mouse.x - img.x, y: mouse.y - img.y};
      found = true;
      drawAll();
      return;
    }
  }
  if (!found) {
    selectedImage = null;
    drawAll();
    drawing = true;
    last = getCanvasCoords(e);
    activeStrokeId = ++strokeIdCounter;
  }
});

canvas.addEventListener('mousemove', (e) => {
  const mouse = getCanvasCoords(e);
  let overHandle = false, overImage = false;
  for (let i = imagesOnCanvas.length - 1; i >= 0; i--) {
    const img = imagesOnCanvas[i];
    if (
      mouse.x > img.x + img.w - 12 && mouse.x < img.x + img.w + 8 &&
      mouse.y > img.y + img.h - 12 && mouse.y < img.y + img.h + 8
    ) {
      overHandle = true;
      break;
    }
    if (
      mouse.x > img.x && mouse.x < img.x + img.w &&
      mouse.y > img.y && mouse.y < img.y + img.h
    ) {
      overImage = true;
      break;
    }
  }
  if (overHandle) {
    canvas.style.cursor = 'nwse-resize';
  } else if (overImage) {
    canvas.style.cursor = 'grab';
  } else {
    canvas.style.cursor = drawing ? 'crosshair' : 'default';
  }
  if (resizingImage) {
    resizingImage.w = Math.max(30, resizeStart.w + (mouse.x - resizeStart.x));
    resizingImage.h = Math.max(30, resizeStart.h + (mouse.y - resizeStart.y));
    drawAll();
    // Emit resize event (page-aware)
    socket.emit('image-resize', { src: resizingImage.src, x: resizingImage.x, y: resizingImage.y, w: resizingImage.w, h: resizingImage.h, page: currentPage });
    return;
  }
  if (draggingImage) {
    draggingImage.x = mouse.x - dragOffset.x;
    draggingImage.y = mouse.y - dragOffset.y;
    drawAll();
    // Emit move event (page-aware)
    socket.emit('image-move', { src: draggingImage.src, x: draggingImage.x, y: draggingImage.y, w: draggingImage.w, h: draggingImage.h, page: currentPage });
    return;
  }
  if (!drawing) return;
  const curr = getCanvasCoords(e);
  drawLine(last, curr, penColor, penSize, true, true);
  last = curr;
});

canvas.addEventListener('mouseup', () => {
  draggingImage = null;
  resizingImage = null;
  drawing = false;
  last = null;
  activeStrokeId = null;
  saveCurrentPage();
});
canvas.addEventListener('mouseout', () => {
  draggingImage = null;
  resizingImage = null;
  drawing = false;
  last = null;
  activeStrokeId = null;
  saveCurrentPage();
});

// --- Touch Support for Mobile Drawing ---
function getTouchCoords(touch) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (touch.clientX - rect.left) * (canvas.width / rect.width),
    y: (touch.clientY - rect.top) * (canvas.height / rect.height)
  };
}
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches || e.touches.length === 0) return;
  e.preventDefault();
  // Start a new stroke on first touch
  const t = e.touches[0];
  drawing = true;
  last = getTouchCoords(t);
  activeStrokeId = ++strokeIdCounter;
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  if (!drawing) return;
  if (!e.touches || e.touches.length === 0) return;
  e.preventDefault();
  const t = e.touches[0];
  const curr = getTouchCoords(t);
  drawLine(last, curr, penColor, penSize, true, true);
  last = curr;
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  drawing = false;
  last = null;
  activeStrokeId = null;
  saveCurrentPage();
}, { passive: false });
canvas.addEventListener('touchcancel', (e) => {
  e.preventDefault();
  drawing = false;
  last = null;
  activeStrokeId = null;
}, { passive: false });

function drawLine(from, to, color, size, emit, save) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.closePath();
  if (save) {
    if (!pages[currentPage].drawings) pages[currentPage].drawings = [];
    const drawing = { from, to, color, size, user: username, strokeId: activeStrokeId };
    pages[currentPage].drawings.push(drawing);
    if (drawing.user === username) redoStack = [];
  }
  if (emit) {
    socket.emit('draw', { from, to, color, size, user: username, page: currentPage, strokeId: activeStrokeId });
  }
}

socket.on('draw', (data) => {
  const targetPage = typeof data.page === 'number' ? data.page : 0;
  // Ensure pages array can hold target page
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (!pages[targetPage].drawings) pages[targetPage].drawings = [];
  pages[targetPage].drawings.push({ from: data.from, to: data.to, color: data.color, size: data.size, user: data.user, strokeId: data.strokeId });
  if (targetPage === currentPage) {
    // Draw only if on the same page
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(data.from.x, data.from.y);
    ctx.lineTo(data.to.x, data.to.y);
    ctx.stroke();
    ctx.closePath();
  }
});

// Chat events
chatForm.onsubmit = (e) => {
  e.preventDefault();
  if (chatInput.value.trim()) {
    socket.emit('chat', chatInput.value.trim());
    chatInput.value = '';
  }
};
socket.on('chat', (msg) => {
  const div = document.createElement('div');
  div.className = 'msg';
  const color = userColors[msg.user] || '#7c3aed';
  const time = msg.time ? new Date(msg.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
  div.innerHTML = `<span class="user"><span class="user-avatar" style="background:${color}"></span>${msg.user}:</span> ${msg.message} <span class="timestamp">${time}</span>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// Typing indicator emit/debounce
let typingTimeout;
chatInput.addEventListener('input', () => {
  socket.emit('typing', chatInput.value.trim().length > 0);
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('typing', false), 1000);
});
socket.on('typing', (name) => {
  typingIndicator.textContent = name ? `${name} is typing...` : '';
});

// User list
socket.on('user-list', (users) => {
  updateUserList(users);
  if (!window.voiceJoined) {
    socket.emit('voice-join', roomId, username);
    window.voiceJoined = true;
  }
});

// Utility: clear canvas on join
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
socket.on('connect', clearCanvas);

// --- Toolbar Popover Logic ---
function closeAllPopovers() {
  colorPopover.classList.remove('active');
  penSizePopover.classList.remove('active');
}
colorBtn.onclick = (e) => {
  e.stopPropagation();
  colorPopover.classList.toggle('active');
  penSizePopover.classList.remove('active');
};
penSizeBtn.onclick = (e) => {
  e.stopPropagation();
  penSizePopover.classList.toggle('active');
  colorPopover.classList.remove('active');
};
document.body.addEventListener('click', closeAllPopovers);
toolbar.addEventListener('click', (e) => e.stopPropagation());

// --- Color Swatches ---
const SWATCHES = [
  '#7c3aed', '#6366f1', '#059669', '#f59e42', '#f43f5e', '#eab308', '#0ea5e9', '#14b8a6', '#f472b6', '#a21caf', '#000', '#fff'
];

// --- Emoji Picker ---
const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','😘','😎','🤩','😇',
  '🙂','😉','😌','😅','🤗','🤝','👍','👏','🙏','💪',
  '🎉','✨','🔥','💯','✅','❌','⚡','💡','🧠','📝',
  '📌','📎','📷','🎤','🎧','🖼️','📄','✏️','🖊️','🧭'
];

function openEmojiPopover() {
  if (!emojiPopover || !emojiBtn) return;
  // Build grid lazily once
  if (!emojiPopover.dataset.loaded) {
    const frag = document.createDocumentFragment();
    EMOJIS.forEach(ch => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emoji-item';
      b.textContent = ch;
      b.onclick = () => {
        insertEmoji(ch);
        closeEmojiPopover();
      };
      frag.appendChild(b);
    });
    emojiPopover.appendChild(frag);
    emojiPopover.dataset.loaded = '1';
  }
  // Show temporarily to measure, then position within viewport near the button
  emojiPopover.style.display = 'grid';
  emojiPopover.style.visibility = 'hidden';
  const btnRect = emojiBtn.getBoundingClientRect();
  const popW = emojiPopover.offsetWidth || 220;
  const popH = emojiPopover.offsetHeight || 200;
  // Prefer below the button; if no space, place above
  let top = btnRect.bottom + 8;
  if (top + popH > window.innerHeight - 8) {
    top = btnRect.top - popH - 8;
    if (top < 8) top = Math.max(8, window.innerHeight - popH - 8);
  }
  let left = btnRect.left;
  if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
  if (left < 8) left = 8;
  emojiPopover.style.top = top + 'px';
  emojiPopover.style.left = left + 'px';
  emojiPopover.style.visibility = 'visible';
  setTimeout(() => document.addEventListener('click', handleEmojiDocClick, { once: true }), 0);
}

function closeEmojiPopover() {
  if (!emojiPopover) return;
  emojiPopover.style.display = 'none';
}

function handleEmojiDocClick(e) {
  if (!emojiPopover || !emojiBtn) return;
  if (emojiPopover.contains(e.target) || emojiBtn.contains(e.target)) return;
  closeEmojiPopover();
}

function insertEmoji(ch) {
  if (!chatInput) return;
  const start = chatInput.selectionStart || chatInput.value.length;
  const end = chatInput.selectionEnd || chatInput.value.length;
  const val = chatInput.value;
  chatInput.value = val.slice(0, start) + ch + val.slice(end);
  const pos = start + ch.length;
  chatInput.setSelectionRange(pos, pos);
  chatInput.focus();
}

if (emojiBtn) {
  emojiBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (emojiPopover && emojiPopover.style.display === 'grid') {
      closeEmojiPopover();
    } else {
      openEmojiPopover();
    }
  });
}

// Close emoji popover on resize/orientation change
window.addEventListener('resize', closeEmojiPopover);
window.addEventListener('orientationchange', closeEmojiPopover);
function renderSwatches() {
  colorSwatches.innerHTML = '';
  SWATCHES.forEach(color => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = color;
    if (colorPicker.value === color) sw.classList.add('selected');
    sw.onclick = () => {
      colorPicker.value = color;
      penColor = color;
      updateColorPreview();
      renderSwatches();
      colorPopover.classList.remove('active');
    };
    colorSwatches.appendChild(sw);
  });
}
colorPicker.oninput = (e) => {
  penColor = e.target.value;
  updateColorPreview();
  renderSwatches();
};
function updateColorPreview() {
  colorPreview.style.background = penColor;
}
// --- Pen Size Preview ---
function updatePenSizePreview() {
  penSizePreview.innerHTML = `<div class="pen-size-line" style="width:28px;height:${penSize}px;"></div>`;
}
penSizeRange.oninput = (e) => {
  penSize = parseInt(e.target.value);
  updatePenSizePreview();
};
// --- Tooltips (native via title attr, see HTML) ---
// --- Initial Render ---
colorPicker.value = penColor || '#7c3aed';
updateColorPreview();
renderSwatches();
penSizeRange.value = penSize;
updatePenSizePreview();

// --- Undo/Redo Stack ---
let undoStack = [], redoStack = [];
function saveState() {
  undoStack.push(whiteboard.toDataURL());
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}
function restoreState(stackFrom, stackTo) {
  if (!stackFrom.length) return;
  stackTo.push(whiteboard.toDataURL());
  const img = new window.Image();
  img.onload = () => {
    ctx.clearRect(0, 0, whiteboard.width, whiteboard.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = stackFrom.pop();
}
undoBtn.onclick = () => {
  if (!pages[currentPage].drawings || pages[currentPage].drawings.length === 0) return;
  // Find the last stroke by this user
  let targetStrokeId = null;
  for (let i = pages[currentPage].drawings.length - 1; i >= 0; i--) {
    const seg = pages[currentPage].drawings[i];
    if (seg.user === username) { targetStrokeId = seg.strokeId ?? null; break; }
  }
  if (targetStrokeId == null) return;
  // Remove all segments belonging to that stroke (preserve original order for redo)
  const removedSegments = [];
  for (let i = pages[currentPage].drawings.length - 1; i >= 0; i--) {
    const seg = pages[currentPage].drawings[i];
    if (seg.strokeId === targetStrokeId && seg.user === username) {
      removedSegments.push(pages[currentPage].drawings.splice(i, 1)[0]);
    }
  }
  removedSegments.reverse();
  if (removedSegments.length === 0) return;
  // Push to redo stack as a stroke bundle
  redoStack.push(removedSegments);
  // Inform peers to remove each segment
  removedSegments.forEach(seg => {
    socket.emit('undo-drawing', { user: username, from: seg.from, to: seg.to, color: seg.color, size: seg.size, page: currentPage });
  });
  drawAll();
};

// Redo full last undone stroke
if (typeof redoBtn !== 'undefined' && redoBtn) {
  redoBtn.onclick = () => {
    if (!redoStack || redoStack.length === 0) return;
    const segments = redoStack.pop();
    if (!pages[currentPage].drawings) pages[currentPage].drawings = [];
    segments.forEach(seg => {
      // Re-add segment locally
      pages[currentPage].drawings.push(seg);
      // Re-emit to peers to redraw and save on their side (page-aware)
      socket.emit('draw', { from: seg.from, to: seg.to, color: seg.color, size: seg.size, user: seg.user, page: currentPage, strokeId: seg.strokeId });
    });
    drawAll();
  };
}
socket.on('undo-drawing', (data) => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  if (!pages[targetPage] || !pages[targetPage].drawings) return;
  for (let i = pages[targetPage].drawings.length - 1; i >= 0; i--) {
    const d = pages[targetPage].drawings[i];
    if (d.user === data.user && d.from.x === data.from.x && d.from.y === data.from.y && d.to.x === data.to.x && d.to.y === data.to.y && d.color === data.color && d.size === data.size) {
      pages[targetPage].drawings.splice(i, 1);
      if (targetPage === currentPage) drawAll();
      break;
    }
  }
});
// Save state on drawing
whiteboard.addEventListener('mousedown', saveState);

// --- Multi-Page Whiteboard ---
// (initialized earlier)

function saveCurrentPage() {
  // Save a snapshot of the full canvas (drawings, images, etc)
  pages[currentPage].snapshot = canvas.toDataURL('image/png');
  // Save sticky notes
  pages[currentPage].notes = Array.from(stickyNotes.children).map(note => ({
    id: note.dataset.id,
    text: note.innerText,
    left: note.style.left,
    top: note.style.top
  }));
  // Save images (store src, x, y, w, h)
  pages[currentPage].images = imagesOnCanvas.map(obj => ({
    src: obj.img.src,
    x: obj.x, y: obj.y, w: obj.w, h: obj.h
  }));
  // Drawings are already in memory
}
function loadPage(idx) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Restore images
  imagesOnCanvas = [];
  if (!pages[idx].drawings) pages[idx].drawings = [];
  if (pages[idx] && pages[idx].images) {
    let loaded = 0;
    const total = pages[idx].images.length;
    if (total === 0) drawAll();
    pages[idx].images.forEach(obj => {
      const img = new window.Image();
      img.onload = function() {
        imagesOnCanvas.push({img, x: obj.x, y: obj.y, w: obj.w, h: obj.h});
        loaded++;
        if (loaded === total) drawAll();
      };
      img.src = obj.src;
    });
  } else {
    drawAll();
  }
  // Remove all sticky notes
  stickyNotes.innerHTML = '';
  // Restore sticky notes for this page
  if (pages[idx] && pages[idx].notes) {
    pages[idx].notes.forEach(noteData => {
      const note = document.createElement('div');
      note.className = 'sticky-note';
      note.contentEditable = true;
      note.style.left = noteData.left;
      note.style.top = noteData.top;
      note.innerText = noteData.text;
      note.onmousedown = (e) => {
        let shiftX = e.clientX - note.offsetLeft;
        let shiftY = e.clientY - note.offsetTop;
        function moveAt(pageX, pageY) {
          note.style.left = pageX - shiftX + 'px';
          note.style.top = pageY - shiftY + 'px';
        }
        function onMouseMove(e) {
          moveAt(e.pageX, e.pageY);
        }
        document.addEventListener('mousemove', onMouseMove);
        note.onmouseup = () => {
          document.removeEventListener('mousemove', onMouseMove);
          note.onmouseup = null;
          saveCurrentPage();
        };
      };
      note.ondblclick = () => { note.remove(); saveCurrentPage(); };
      note.oninput = () => saveCurrentPage();
      // Attach handlers so moving/editing/deleting emits page-aware events
  note.onmousedown = (e) => {
    let shiftX = e.clientX - note.offsetLeft;
    let shiftY = e.clientY - note.offsetTop;
    function moveAt(pageX, pageY) {
      note.style.left = pageX - shiftX + 'px';
      note.style.top = pageY - shiftY + 'px';
      socket.emit('sticky-move', { id: note.dataset.id, left: note.style.left, top: note.style.top, text: note.innerText, page: currentPage });
    }
    function onMouseMove(e) {
      moveAt(e.pageX, e.pageY);
    }
    document.addEventListener('mousemove', onMouseMove);
    note.onmouseup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      note.onmouseup = null;
      saveCurrentPage();
    };
  };
  note.ondblclick = () => { note.remove(); socket.emit('sticky-delete', { id: note.dataset.id, page: currentPage }); saveCurrentPage(); };
  note.oninput = () => { socket.emit('sticky-edit', { id: note.dataset.id, left: note.style.left, top: note.style.top, text: note.innerText, page: currentPage }); saveCurrentPage(); };
  stickyNotes.appendChild(note);
    });
  }
}
function addPage() {
  saveCurrentPage();
  pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  currentPage = pages.length - 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stickyNotes.innerHTML = '';
  updatePageNav();
  // Inform others to add a page and navigate to it
  socket.emit('page-add', { page: currentPage, total: pages.length });
  socket.emit('page-change', { page: currentPage });
}
function gotoPage(idx) {
  if (idx < 0 || idx >= pages.length) return;
  saveCurrentPage();
  currentPage = idx;
  loadPage(currentPage);
  updatePageNav();
  socket.emit('page-change', { page: currentPage });
}
socket.on('page-change', data => {
  // Ensure local pages array is large enough
  while (pages.length <= data.page) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (currentPage !== data.page) {
    saveCurrentPage();
    currentPage = data.page;
    loadPage(currentPage);
    updatePageNav();
  }
});
// Navigation UI
const pageNav = document.createElement('div');
pageNav.id = 'pageNav';
pageNav.style.display = 'flex';
pageNav.style.justifyContent = 'center';
pageNav.style.alignItems = 'center';
pageNav.style.gap = '12px';
pageNav.style.margin = '12px 0';
const prevBtn = document.createElement('button');
prevBtn.textContent = '⟨ Prev';
const nextBtn = document.createElement('button');
nextBtn.textContent = 'Next ⟩';
const addBtn = document.createElement('button');
addBtn.textContent = '+ Add Page';
const pageLabel = document.createElement('span');
pageNav.append(prevBtn, pageLabel, nextBtn, addBtn);
document.querySelector('.toolbar').after(pageNav);

// --- Page Add Sync ---
socket.on('page-add', data => {
  // Expand pages up to reported total or at least target index
  const targetLen = Math.max(pages.length, (typeof data.total === 'number' ? data.total : pages.length), (typeof data.page === 'number' ? data.page + 1 : pages.length));
  while (pages.length < targetLen) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  updatePageNav();
});

// --- Add Lock Image Button to PageNav ---
let lockBtn = document.createElement('button');
lockBtn.id = 'imageLockBtn';
lockBtn.textContent = 'Lock Image';
lockBtn.style.background = '#6366f1';
lockBtn.style.color = '#fff';
lockBtn.style.border = 'none';
lockBtn.style.borderRadius = '8px';
lockBtn.style.padding = '8px 16px';
lockBtn.style.fontWeight = 'bold';
lockBtn.style.cursor = 'pointer';
lockBtn.style.display = 'none';
lockBtn.style.marginRight = '8px';
lockBtn.onclick = () => {
  if (lockedImage) {
    lockedImage = null;
    lockBtn.textContent = 'Lock Image';
  } else if (selectedImage) {
    lockedImage = selectedImage;
    selectedImage = null;
    lockBtn.textContent = 'Unlock Image';
  }
  drawAll();
};
// Insert lockBtn before addBtn in pageNav
pageNav.insertBefore(lockBtn, addBtn);

function showImageLockButton() {
  if (selectedImage || lockedImage) {
    lockBtn.style.display = '';
    lockBtn.textContent = lockedImage ? 'Unlock Image' : 'Lock Image';
  } else {
    lockBtn.style.display = 'none';
  }
}

function updatePageNav() {
  pageLabel.textContent = `Page ${currentPage + 1} of ${pages.length}`;
  prevBtn.style.display = pages.length > 1 ? '' : 'none';
  nextBtn.style.display = pages.length > 1 ? '' : 'none';
  addBtn.style.display = '';
}
prevBtn.onclick = () => gotoPage(currentPage - 1);
nextBtn.onclick = () => gotoPage(currentPage + 1);
addBtn.onclick = addPage;
updatePageNav();
// --- Save/Load/Export ---
saveLoadExport.onclick = () => notify('Save/Load/Export coming soon!');
// --- Invite Link ---
function updateInviteLink() {
  let base = window.location.origin + window.location.pathname;
  let params = `?room=${encodeURIComponent(roomId || '')}`;
  if (roomPassword.value) params += `&password=${encodeURIComponent(roomPassword.value)}`;
  inviteLink.value = base + params;
  inviteLink.style.display = '';
  if (copyInviteBtn) copyInviteBtn.style.display = '';
  // Update URL without reload for easy sharing
  try { window.history.replaceState({}, '', inviteLink.value); } catch (_) {}
}
// Call updateInviteLink after joining/creating room and after setting password
setPasswordBtn.onclick = () => {
  socket.emit('set-room-password', { roomId: roomInput.value.trim() || roomId, password: roomPassword.value });
  updateInviteLink();
};
roomPassword.addEventListener('input', updateInviteLink);
roomInput.addEventListener('input', updateInviteLink);
// --- User Roles ---
roleContainer.onclick = () => notify('User roles coming soon!');
// --- Custom Avatar/Nickname Modal ---
avatarNicknameModal.onclick = () => notify('Custom avatar/nickname coming soon!');
// --- Mobile Support ---
window.addEventListener('resize', () => {
  updateChatFabVisibility();
  // Redraw on viewport changes to keep canvas visuals intact
  resizeCanvas();
  drawAll();
});

function showHome() {
  home.classList.remove('hidden');
  document.getElementById('app').style.display = 'none';
}
function showApp() {
  home.classList.add('hidden');
  document.getElementById('app').style.display = '';
}

function joinRoom() {
  username = usernameInput.value.trim();
  if (!username) {
    notify('Please enter your name to join.', 'error');
    usernameInput.focus();
    return;
  }
  roomId = roomInput.value.trim() || Math.random().toString(36).substr(2, 6);
  userColor = getRandomColor();
  penColor = userColor;
  colorPicker.value = userColor;
  showApp();
  resizeCanvas();
  socket.emit('join-room', { roomId, username, password: roomPassword.value });
  updateInviteLink();
}
if (joinForm) {
  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    joinRoom();
  });
}

// --- Eraser Button ---
eraserBtn.onclick = () => {
  erasing = !erasing;
  if (erasing) {
    penColor = '#fff';
    eraserBtn.style.background = 'linear-gradient(135deg, #fbbf24, #f3f4f6)';
  } else {
    penColor = colorPicker.value;
    eraserBtn.style.background = '';
  }
};

// --- Download as PNG ---
downloadBtn.onclick = () => {
  saveCurrentPage();
  const link = document.createElement('a');
  link.download = `whiteboard-${roomId || 'page' + (currentPage + 1)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

// --- Image Insert with Drag/Resize ---
const imageInput = document.createElement('input');
imageInput.type = 'file';
imageInput.accept = 'image/*';
imageInput.multiple = true;
imageInput.style.display = 'none';
document.body.appendChild(imageInput);
imageBtn.onclick = () => imageInput.click();
imageInput.onchange = (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(ev) {
      const img = new window.Image();
      img.onload = function() {
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height, 0.5);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        const newObj = {img, x, y, w, h, src: ev.target.result};
        imagesOnCanvas.push(newObj);
        selectedImage = newObj;
        lockedImage = null;
        drawAll();
        saveCurrentPage();
        socket.emit('image-add', { src: ev.target.result, x, y, w, h, page: currentPage });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  imageInput.value = '';
};

// --- Image Deletion Sync ---
window.addEventListener('keydown', (e) => {
  if (e.key === 'Backspace' && selectedImage) {
    socket.emit('image-delete', { src: selectedImage.src, page: currentPage });
    imagesOnCanvas = imagesOnCanvas.filter(obj => obj !== selectedImage);
    selectedImage = null;
    lockedImage = null;
    drawAll();
    saveCurrentPage();
    e.preventDefault();
  }
});
socket.on('image-delete', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (pages[targetPage] && pages[targetPage].images) {
    pages[targetPage].images = pages[targetPage].images.filter(obj => obj.src !== data.src);
  }
  if (targetPage === currentPage) {
    imagesOnCanvas = imagesOnCanvas.filter(obj => obj.src !== data.src);
    drawAll();
  }
});

// --- Add Page from Toolbar ---
multiPageBtn.onclick = addPage;

// --- drawAll: Redraw all images and shapes for current page ---
function drawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  imagesOnCanvas.forEach(obj => {
    ctx.drawImage(obj.img, obj.x, obj.y, obj.w, obj.h);
    if (selectedImage && selectedImage.img === obj.img && selectedImage.x === obj.x && selectedImage.y === obj.y) {
      ctx.save();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(obj.x + obj.w, obj.y + obj.h, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(obj.x + obj.w - 7, obj.y + obj.h + 7);
      ctx.lineTo(obj.x + obj.w + 7, obj.y + obj.h - 7);
      ctx.stroke();
      ctx.restore();
    }
  });
  showImageLockButton();
  if (pages && pages[currentPage] && pages[currentPage].drawings) {
    pages[currentPage].drawings.forEach(line => {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(line.from.x, line.from.y);
      ctx.lineTo(line.to.x, line.to.y);
      ctx.stroke();
      ctx.closePath();
    });
  }
}

// --- Sticky Notes ---
function generateNoteId() {
  return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).substr(2, 9));
}
stickyNoteBtn.onclick = () => {
  const id = generateNoteId();
  const note = document.createElement('div');
  note.className = 'sticky-note';
  note.contentEditable = true;
  note.dataset.id = id;
  note.style.left = Math.random() * (whiteboard.offsetWidth - 160) + 'px';
  note.style.top = Math.random() * (whiteboard.offsetHeight - 120) + 'px';
  note.innerText = 'Sticky Note';
  note.onmousedown = (e) => {
    let shiftX = e.clientX - note.offsetLeft;
    let shiftY = e.clientY - note.offsetTop;
    function moveAt(pageX, pageY) {
      note.style.left = pageX - shiftX + 'px';
      note.style.top = pageY - shiftY + 'px';
      socket.emit('sticky-move', { id, left: note.style.left, top: note.style.top, text: note.innerText, page: currentPage });
    }
    function onMouseMove(e) {
      moveAt(e.pageX, e.pageY);
    }
    document.addEventListener('mousemove', onMouseMove);
    note.onmouseup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      note.onmouseup = null;
      saveCurrentPage();
    };
  };
  note.ondblclick = () => { note.remove(); socket.emit('sticky-delete', { id, page: currentPage }); saveCurrentPage(); };
  note.oninput = () => { socket.emit('sticky-edit', { id, left: note.style.left, top: note.style.top, text: note.innerText, page: currentPage }); saveCurrentPage(); };
  stickyNotes.appendChild(note);
  socket.emit('sticky-add', { id, left: note.style.left, top: note.style.top, text: note.innerText, page: currentPage });
  saveCurrentPage();
};

socket.on('sticky-add', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (!pages[targetPage].notes) pages[targetPage].notes = [];
  // Update per-page state
  if (!pages[targetPage].notes.find(n => n.id === data.id)) {
    pages[targetPage].notes.push({ id: data.id, left: data.left, top: data.top, text: data.text });
  }
  if (targetPage !== currentPage) return;
  if (document.querySelector(`.sticky-note[data-id='${data.id}']`)) return;
  const note = document.createElement('div');
  note.className = 'sticky-note';
  note.contentEditable = true;
  note.dataset.id = data.id;
  note.style.left = data.left;
  note.style.top = data.top;
  note.innerText = data.text;
  // Attach handlers for remote-created notes as well
  note.onmousedown = (e) => {
    let shiftX = e.clientX - note.offsetLeft;
    let shiftY = e.clientY - note.offsetTop;
    function moveAt(pageX, pageY) {
      note.style.left = pageX - shiftX + 'px';
      note.style.top = pageY - shiftY + 'px';
      socket.emit('sticky-move', { id: data.id, left: note.style.left, top: note.style.top, text: note.innerText, page: targetPage });
    }
    function onMouseMove(e) {
      moveAt(e.pageX, e.pageY);
    }
    document.addEventListener('mousemove', onMouseMove);
    note.onmouseup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      note.onmouseup = null;
      saveCurrentPage();
    };
  };
  note.ondblclick = () => { note.remove(); socket.emit('sticky-delete', { id: data.id, page: targetPage }); saveCurrentPage(); };
  note.oninput = () => { socket.emit('sticky-edit', { id: data.id, left: note.style.left, top: note.style.top, text: note.innerText, page: targetPage }); saveCurrentPage(); };
  stickyNotes.appendChild(note);
});
socket.on('sticky-move', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (!pages[targetPage].notes) pages[targetPage].notes = [];
  const rec = pages[targetPage].notes.find(n => n.id === data.id);
  if (rec) { rec.left = data.left; rec.top = data.top; }
  if (targetPage !== currentPage) return;
  const note = document.querySelector(`.sticky-note[data-id='${data.id}']`);
  if (note) {
    note.style.left = data.left;
    note.style.top = data.top;
  }
});
socket.on('sticky-edit', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (!pages[targetPage].notes) pages[targetPage].notes = [];
  const rec = pages[targetPage].notes.find(n => n.id === data.id);
  if (rec) { rec.text = data.text; }
  if (targetPage !== currentPage) return;
  const note = document.querySelector(`.sticky-note[data-id='${data.id}']`);
  if (note) {
    note.innerText = data.text;
  }
});
socket.on('sticky-delete', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (!pages[targetPage].notes) pages[targetPage].notes = [];
  pages[targetPage].notes = pages[targetPage].notes.filter(n => n.id !== data.id);
  if (targetPage !== currentPage) return;
  const note = document.querySelector(`.sticky-note[data-id='${data.id}']`);
  if (note) note.remove();
});

// (Removed duplicate imageInput.onchange handler to prevent double insert)

// Listen for image events
socket.on('image-add', data => {
  const img = new window.Image();
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  img.onload = function() {
    const newObj = {img, x: data.x, y: data.y, w: data.w, h: data.h, src: data.src};
    // Ensure storage for target page
    while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
    if (!pages[targetPage].images) pages[targetPage].images = [];
    pages[targetPage].images.push({ src: data.src, x: data.x, y: data.y, w: data.w, h: data.h });
    if (targetPage === currentPage) {
      imagesOnCanvas.push(newObj);
      drawAll();
    }
  };
  img.src = data.src;
});

// Listen for image move/resize events
socket.on('image-move', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  // Update stored page images
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (pages[targetPage] && pages[targetPage].images) {
    const imgRec = pages[targetPage].images.find(obj => obj.src === data.src);
    if (imgRec) { imgRec.x = data.x; imgRec.y = data.y; imgRec.w = data.w; imgRec.h = data.h; }
  }
  if (targetPage === currentPage) {
    const imgObj = imagesOnCanvas.find(obj => obj.src === data.src);
    if (imgObj) { imgObj.x = data.x; imgObj.y = data.y; imgObj.w = data.w; imgObj.h = data.h; drawAll(); }
  }
});
socket.on('image-resize', data => {
  const targetPage = typeof data.page === 'number' ? data.page : currentPage;
  while (pages.length <= targetPage) pages.push({ snapshot: null, notes: [], images: [], drawings: [] });
  if (pages[targetPage] && pages[targetPage].images) {
    const imgRec = pages[targetPage].images.find(obj => obj.src === data.src);
    if (imgRec) { imgRec.x = data.x; imgRec.y = data.y; imgRec.w = data.w; imgRec.h = data.h; }
  }
  if (targetPage === currentPage) {
    const imgObj = imagesOnCanvas.find(obj => obj.src === data.src);
    if (imgObj) { imgObj.x = data.x; imgObj.y = data.y; imgObj.w = data.w; imgObj.h = data.h; drawAll(); }
  }
});

if (copyInviteBtn) {
  copyInviteBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink.value);
      copyInviteBtn.textContent = '✅';
    } catch (e) {
      // Fallback
      inviteLink.select();
      document.execCommand('copy');
      copyInviteBtn.textContent = '✅';
    }
    setTimeout(() => { copyInviteBtn.textContent = '🔗'; }, 1000);
  };
}

// --- Auto-fill room and password from URL for invite links ---
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  const password = params.get('password');
  if (room) roomInput.value = room;
  if (password) roomPassword.value = password;
});

// --- Improved Audio Constraints ---
const audioConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 2
  }
};

// --- Mic Button Logic (add/remove track only) ---
async function renegotiateAllPeers() {
  for (const [peerId, pc] of Object.entries(peerConnections)) {
    if (pc.signalingState === 'stable') {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice-offer', { to: peerId, offer });
      } catch (e) {
        console.error('Renegotiation error:', e);
      }
    }
  }
}

function stopVoiceDetection() {
  if (typeof speakingInterval !== 'undefined' && speakingInterval) clearInterval(speakingInterval);
  if (typeof audioContext !== 'undefined' && audioContext) audioContext.close();
  speakingInterval = null;
  audioContext = null;
}

micBtn.onclick = async () => {
  if (!isMicOn) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      localStream = stream;
      localAudioTrack = stream.getAudioTracks()[0];
      isMicOn = true;
      micBtn.style.background = 'linear-gradient(135deg, #34d399, #10b981)';
      startVoiceDetection();
      // Enable audio track and add to all peer connections
      if (localAudioTrack) {
        localAudioTrack.enabled = true;
        Object.values(peerConnections).forEach(pc => {
          if (!pc.getSenders().some(s => s.track === localAudioTrack)) {
            pc.addTrack(localAudioTrack, localStream);
          }
        });
      }
      console.log('Mic ON, localStream:', localStream);
    } catch (err) {
      alert('Microphone access denied.');
      console.error('Mic access error:', err);
    }
  } else {
    // Disable audio track for all peer connections
    if (localAudioTrack) localAudioTrack.enabled = false;
    stopVoiceDetection();
    // Broadcast not speaking when mic turns off
    socket.emit('speaking', { roomId, username, isSpeaking: false });
    isMicOn = false;
    micBtn.style.background = '';
    micBtn.classList.remove('speaking');
    console.log('Mic OFF, localStream disabled');
  }
};

function startVoiceDetection() {
  if (!localStream) return;
  if (speakingInterval) clearInterval(speakingInterval);
  if (audioContext) try { audioContext.close(); } catch (_) {}
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(localStream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  speakingInterval = setInterval(() => {
    analyser.getByteTimeDomainData(data);
    // Compute RMS
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const isSpeakingNow = rms > 0.07; // threshold
    micBtn.classList.toggle('speaking', isSpeakingNow);
    socket.emit('speaking', { roomId, username, isSpeaking: isSpeakingNow });
  }, 300);
}

// --- Peer Connection Logic ---
function createPeerConnection(peerId, isInitiator) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ],
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  });
  peerConnections[peerId] = pc;
  // Always add audio track if it exists and is enabled
  if (localAudioTrack && localAudioTrack.enabled && localStream) {
    pc.addTrack(localAudioTrack, localStream);
  }
  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('voice-ice', { to: peerId, candidate: event.candidate });
    }
  };
  pc.ontrack = event => {
    if (event.streams && event.streams[0]) {
      remoteAudio.srcObject = event.streams[0];
    }
  };
  if (isInitiator) {
    pc.onnegotiationneeded = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('voice-offer', { to: peerId, offer });
    };
  }
}

// --- Debug logs and error handling for user list ---
function updateUserList(users) {
  try {
    userList.innerHTML = '';
    users.forEach(u => {
      if (!userColors[u.name]) userColors[u.name] = u.color || getRandomColor();
      const li = document.createElement('li');
      const isSpeaking = speakingUsers.has(u.name);
      li.innerHTML = `<span class="user-avatar${u.drawing ? ' user-drawing' : ''}" style="background:${userColors[u.name]}">${isSpeaking ? '<span class=\'user-dot speaking\'></span>' : '<span class=\'user-dot\'></span>'}</span>${u.name}`;
      userList.appendChild(li);
    });
    // Quiet in production: no noisy logs
  } catch (err) {
    console.error('Error updating user list:', err, users);
  }
}

// --- WebRTC Voice Chat Signaling ---
socket.on('voice-users', users => {
  users.forEach(user => {
    if (user !== socket.id && !peerConnections[user]) {
      createPeerConnection(user, true);
    }
  });
  // Remove peer connections for users who left
  Object.keys(peerConnections).forEach(id => {
    if (!users.includes(id)) {
      try { peerConnections[id].close(); } catch (e) {}
      delete peerConnections[id];
    }
  });
});

// Speaking users broadcast -> update set and refresh UI
socket.on('speaking-users', (names) => {
  speakingUsers = new Set(names || []);
  // Request latest user list refresh by triggering updateUserList on current list if available
  // This assumes we keep last known list in closure; if not, rely on server 'user-list' events.
  // For immediate UI feedback, we can rebuild using existing DOM names:
  const currentUsers = Array.from(userList.querySelectorAll('li')).map(li => {
    const name = li.textContent;
    return { name, color: userColors[name] || getRandomColor(), drawing: li.querySelector('.user-drawing') != null };
  });
  if (currentUsers.length) updateUserList(currentUsers);
});

// Password events
socket.on('password-incorrect', () => {
  notify('Incorrect room password.', 'error');
  showHome();
});
socket.on('password-set', (data) => {
  if (data && data.success) {
    notify('Room password set.', 'success');
  }
});

socket.on('voice-offer', async ({ from, offer }) => {
  if (!peerConnections[from]) createPeerConnection(from, false);
  await peerConnections[from].setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnections[from].createAnswer();
  await peerConnections[from].setLocalDescription(answer);
  socket.emit('voice-answer', { to: from, answer });
});

socket.on('voice-answer', async ({ from, answer }) => {
  if (peerConnections[from]) {
    await peerConnections[from].setRemoteDescription(new RTCSessionDescription(answer));
  }
});

socket.on('voice-ice', ({ from, candidate }) => {
  if (peerConnections[from]) {
    peerConnections[from].addIceCandidate(new RTCIceCandidate(candidate));
  }
});

// --- Notifications (UI) ---
function notify(msg, type = 'info') {
  try {
    const container = document.getElementById('notificationContainer');
    if (!container) { console.log('NOTIFY:', msg); return; }
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 200ms ease, transform 200ms ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-10px)';
      setTimeout(() => el.remove(), 300);
    }, 1800);
  } catch (e) {
    console.log('NOTIFY:', msg);
  }
}