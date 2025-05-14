const { createApp, ref, onMounted, nextTick, watch } = Vue;

createApp({
  setup() {
    const sessions = ref([]);
    const messages = ref([]);
    const userInput = ref('');
    const currentSessionId = ref(null);
    const apiBase = 'http://127.0.0.1:8000';
    const selectedModel = ref(localStorage.getItem('selectedModel') || 'gemma3:1b');

    watch(selectedModel, (newModel) => {
      localStorage.setItem('selectedModel', newModel);
    });

    const scrollToBottom = () => {
      const chatBox = document.getElementById("chat-box");
      if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    };

    const listSessions = async () => {
      const res = await fetch(`${apiBase}/sessions/`);
      sessions.value = await res.json();
    };

    const createSession = async () => {
      const title = prompt("聊天室標題？") || "新聊天室";
      if (!title) return;
      await fetch(`${apiBase}/sessions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      await listSessions();
    };

    const loadSession = async (id) => {
      currentSessionId.value = id;
      const res = await fetch(`${apiBase}/msgs/${id}`);
      messages.value = await res.json();
      setTimeout(() => {
        const chatBox = document.getElementById("chat-box");
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
      }, 100);
    };

    const editSession = async (id, oldTitle) => {
      const newTitle = prompt("修改聊天室標題：", oldTitle);
      if (!newTitle || newTitle.trim() === oldTitle) return;
      await fetch(`${apiBase}/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      await listSessions();
    };

    const deleteSession = async (id) => {
      if (!confirm("Delete chat?")) return;
      await fetch(`${apiBase}/sessions/${id}`, {
        method: "DELETE",
      });

      if (currentSessionId.value === id) {
        currentSessionId.value = null;
        messages.value = [];
      }

      await listSessions();
    };

    const sendMessage = async () => {
      const text = userInput.value.trim();
      if (!text || !currentSessionId.value) return;
      userInput.value = '';

      messages.value.push({ role: 'user', content: text });

      const response = await fetch(`${apiBase}/msgs/${currentSessionId.value}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_msg: text, model: selectedModel.value }),
      });

      const assistantMsg = { role: 'assistant', content: '' };
      messages.value = [...messages.value];
      await nextTick();
      scrollToBottom();

      messages.value.push(assistantMsg);
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantMsg.content += decoder.decode(value, { stream: true });
        messages.value = [...messages.value];
        scrollToBottom();
      }
    };

    onMounted(() => {
      listSessions();
    });

    return {
      sessions,
      messages,
      userInput,
      currentSessionId,
      createSession,
      loadSession,
      deleteSession,
      sendMessage,
      selectedModel,
      editSession,
    };
  }
}).mount('#app');
