/*
  BUGTRACKER.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

class BugTracker {
    constructor() {
        this.container = null;
        this.token = localStorage.getItem('jwtToken');
        this.userEmail = localStorage.getItem('userEmail') || '';
    }

    async init() {
        this.render();
        await this.loadBugs();
    }

    render() {
        let html = `
            <div class="bug-tracker-panel">
                <h2>🐞 Bug Tracking</h2>
                <form id="bug-form" class="bug-form">
                    <input type="text" id="bug-title" placeholder="Bug Title" required style="width: 100%; margin-bottom: 8px;" />
                    <textarea id="bug-description" placeholder="Describe the issue..." required style="width: 100%; margin-bottom: 8px;"></textarea>
                    <input type="email" id="bug-email" placeholder="Your Email" value="${this.userEmail}" required style="width: 100%; margin-bottom: 8px;" />
                    <button type="submit">Submit Bug</button>
                </form>
                <div id="bug-list" class="bug-list" style="margin-top: 24px;"></div>
            </div>
        `;
        let container = document.getElementById('bug-tracker-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'bug-tracker-container';
            document.body.appendChild(container);
        }
        container.innerHTML = html;
        this.container = container;

        document.getElementById('bug-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.submitBug();
        };
    }

    async submitBug() {
        const title = document.getElementById('bug-title').value.trim();
        const description = document.getElementById('bug-description').value.trim();
        const submittedBy = document.getElementById('bug-email').value.trim();
        if (!title || !description || !submittedBy) return;
        try {
            const res = await fetch('/api/bugs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, submittedBy })
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('bug-form').reset();
                if (window.ToastManager) window.ToastManager.show('Bug submitted!', 'success');
                await this.loadBugs();
            } else {
                if (window.ToastManager) window.ToastManager.show('Error: ' + data.message, 'error');
            }
        } catch (err) {
            if (window.ToastManager) window.ToastManager.show('Error submitting bug', 'error');
        }
    }

    async loadBugs() {
        const bugList = document.getElementById('bug-list');
        if (!this.token) {
            bugList.innerHTML = '<p>Login to view your submitted bugs.</p>';
            return;
        }
        try {
            const res = await fetch('/api/bugs', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            if (!data.bugs.length) {
                bugList.innerHTML = '<p>No bugs submitted yet.</p>';
                return;
            }
            bugList.innerHTML = data.bugs.map(bug => `
                <div class="bug-item" style="border:1px solid #ccc; border-radius:6px; margin-bottom:12px; padding:12px;">
                    <strong>${bug.title}</strong> <span style="color:#888;">(${bug.status}, ${bug.severity})</span><br/>
                    <span style="font-size:13px;">${bug.description}</span><br/>
                    <span style="font-size:12px; color:#888;">Submitted by: ${bug.submittedBy} on ${new Date(bug.created).toLocaleString()}</span>
                </div>
            `).join('');
        } catch (err) {
            bugList.innerHTML = `<p style="color:#dc2626;">Error loading bugs: ${err.message}</p>`;
        }
    }
}

// Export or attach to window
window.BugTracker = BugTracker;

// Optionally auto-initialize for testing
// new BugTracker().init(); 