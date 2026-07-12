// ==========================================================================
// TRANSITOPS SPA CLIENT ENGINE
// ==========================================================================

const API_BASE = ''; // Same origin

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const errorBox = document.getElementById('login-error-box');
const errorMessageText = document.getElementById('error-message-text');

const sidebarUserName = document.getElementById('sidebar-user-name');
const sidebarUserRole = document.getElementById('sidebar-user-role');
const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
const navUserEmail = document.getElementById('nav-user-email');
const navRoleBadge = document.getElementById('nav-role-badge');
const workspaceTitle = document.getElementById('workspace-title');
const workspaceSubtitle = document.getElementById('workspace-subtitle');
const statsContainer = document.getElementById('stats-container');
const panelTitleText = document.getElementById('panel-title-text');
const tableHeaders = document.getElementById('table-headers');
const tableRows = document.getElementById('table-rows');
const visualizationSection = document.getElementById('visualization-section');
const dashboardLoader = document.getElementById('dashboard-loader');
const timeDisplay = document.getElementById('time-display');

// Global State
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    startClock();
    
    // Bind login form submit
    loginForm.addEventListener('submit', handleLogin);
    
    // Bind logout button
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
});

// 1. Clock Display
function startClock() {
    setInterval(() => {
        const now = new Date();
        timeDisplay.innerText = now.toLocaleTimeString();
    }, 1000);
}

// 2. Check Auth Status on Load
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/status`);
        const result = await response.json();
        
        if (result.authenticated) {
            currentUser = result.user;
            showDashboardView();
        } else {
            showLoginView();
        }
    } catch (error) {
        console.error("Auth status check failed:", error);
        showLoginView();
    }
}

// 3. Handle Login Submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const remember = document.getElementById('remember').checked;
    
    // Hide previous errors
    errorBox.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, role })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            currentUser = result.user;
            // Clear inputs
            loginForm.reset();
            showDashboardView();
        } else {
            // Display error box and text
            errorMessageText.innerText = result.message || "Invalid credentials.";
            errorBox.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Login request failed:", error);
        errorMessageText.innerText = "Connection error. Please check if the server is running.";
        errorBox.classList.remove('hidden');
    }
}

// 4. Handle Logout
async function handleLogout(e) {
    e.preventDefault();
    try {
        await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
    } catch (error) {
        console.error("Logout failed:", error);
    }
    currentUser = null;
    showLoginView();
}

// 5. Toggle Views
function showLoginView() {
    loginSection.classList.add('active-view');
    loginSection.classList.remove('hidden-view');
    dashboardSection.classList.add('hidden-view');
    dashboardSection.classList.remove('active-view');
}

function showDashboardView() {
    loginSection.classList.add('hidden-view');
    loginSection.classList.remove('active-view');
    dashboardSection.classList.add('active-view');
    dashboardSection.classList.remove('hidden-view');
    
    // Set Profile UI Elements
    const nameStr = currentUser.email.split('@')[0];
    sidebarUserName.innerText = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
    sidebarUserAvatar.innerText = currentUser.role.charAt(0).toUpperCase();
    navUserEmail.innerText = currentUser.email;
    
    // Clear previously added role-badge classes
    navRoleBadge.className = 'role-badge';
    sidebarUserRole.className = 'badge';
    
    // Apply role specific badge class
    const roleSlug = currentUser.role.toLowerCase().replace(' ', '-');
    sidebarUserRole.classList.add(roleSlug);
    sidebarUserRole.innerText = currentUser.role;
    navRoleBadge.innerText = currentUser.role;
    
    // Set Dashboard Navigation display scopes
    document.querySelectorAll('.role-nav-items').forEach(el => el.classList.add('hidden'));
    
    if (currentUser.role === 'Fleet Manager') {
        document.querySelector('.fleet-manager-nav').classList.remove('hidden');
        workspaceTitle.innerText = "Fleet & Maintenance Center";
        workspaceSubtitle.innerText = "Real-time fleet health, diagnostics, and maintenance schedules";
    } else if (currentUser.role === 'Dispatcher') {
        document.querySelector('.dispatcher-nav').classList.remove('hidden');
        workspaceTitle.innerText = "Transit Dispatch Monitor";
        workspaceSubtitle.innerText = "Live route tracking, scheduling, and driver assignments";
    } else if (currentUser.role === 'Safety Officer') {
        document.querySelector('.safety-officer-nav').classList.remove('hidden');
        workspaceTitle.innerText = "Driver Safety & Compliance";
        workspaceSubtitle.innerText = "Safety scorecards, drug test status, and driver certifications";
    } else if (currentUser.role === 'Financial Analyst') {
        document.querySelector('.financial-analyst-nav').classList.remove('hidden');
        workspaceTitle.innerText = "Financial Analytics & Expenses";
        workspaceSubtitle.innerText = "Operational expenses, fuel expenditures, and budget analytics";
    }
    
    // Load MySQL database content
    loadDashboardData();
}

// 6. Fetch Database Data & Render Scoped Widgets
async function loadDashboardData() {
    dashboardLoader.classList.remove('hidden');
    statsContainer.innerHTML = '';
    tableHeaders.innerHTML = '';
    tableRows.innerHTML = '';
    visualizationSection.innerHTML = '';
    
    try {
        const response = await fetch(`${API_BASE}/api/dashboard/data`);
        if (!response.ok) {
            throw new Error(`Server returned code ${response.status}`);
        }
        const payload = await response.json();
        const role = payload.role;
        const stats = payload.stats;
        const data = payload.data;
        
        renderStats(role, stats);
        renderTable(role, data);
        renderVisualizations(role, data);
        
    } catch (error) {
        console.error("Failed to load dashboard data:", error);
        tableRows.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="color: var(--color-error); font-weight: 600;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Error loading data from MySQL database. Please verify connection.
                </td>
            </tr>
        `;
    } finally {
        dashboardLoader.classList.add('hidden');
    }
}

// 7. Render Statistics Grid Cards
function renderStats(role, stats) {
    let cardsHTML = '';
    
    if (role === 'Fleet Manager') {
        cardsHTML = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-truck"></i></div>
                <div>
                    <div class="stat-value">${stats.total_vehicles}</div>
                    <div class="stat-label">Total Fleet Size</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-circle-check"></i></div>
                <div>
                    <div class="stat-value">${stats.active_vehicles}</div>
                    <div class="stat-label">Active Vehicles</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-screwdriver-wrench"></i></div>
                <div>
                    <div class="stat-value">${stats.in_maintenance}</div>
                    <div class="stat-label">In Maintenance</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-gas-pump"></i></div>
                <div>
                    <div class="stat-value">${stats.avg_fuel_level}</div>
                    <div class="stat-label">Avg Fuel Level</div>
                </div>
            </div>
        `;
    } else if (role === 'Dispatcher') {
        cardsHTML = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-route"></i></div>
                <div>
                    <div class="stat-value">${stats.total_trips}</div>
                    <div class="stat-label">Total Managed Trips</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-truck-fast"></i></div>
                <div>
                    <div class="stat-value">${stats.in_transit}</div>
                    <div class="stat-label">In Transit</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-regular fa-calendar-check"></i></div>
                <div>
                    <div class="stat-value">${stats.scheduled}</div>
                    <div class="stat-label">Scheduled Today</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-circle-check"></i></div>
                <div>
                    <div class="stat-value">${stats.completed}</div>
                    <div class="stat-label">Completed Trips</div>
                </div>
            </div>
        `;
    } else if (role === 'Safety Officer') {
        cardsHTML = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
                <div>
                    <div class="stat-value">${stats.total_drivers}</div>
                    <div class="stat-label">Registered Drivers</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-heart-pulse"></i></div>
                <div>
                    <div class="stat-value">${stats.avg_safety_score}</div>
                    <div class="stat-label">Avg Safety Score</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-truck-moving"></i></div>
                <div>
                    <div class="stat-value">${stats.active_drivers}</div>
                    <div class="stat-label">Active Drivers</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-shield-check"></i></div>
                <div>
                    <div class="stat-value">${stats.compliance_passed}</div>
                    <div class="stat-label">Compliance Passes</div>
                </div>
            </div>
        `;
    } else if (role === 'Financial Analyst') {
        cardsHTML = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-money-bill-wave"></i></div>
                <div>
                    <div class="stat-value">${stats.total_expenses}</div>
                    <div class="stat-label">Total Outflow</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-gas-pump"></i></div>
                <div>
                    <div class="stat-value">${stats.fuel_costs}</div>
                    <div class="stat-label">Fuel Expenses</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-wrench"></i></div>
                <div>
                    <div class="stat-value">${stats.maintenance_costs}</div>
                    <div class="stat-label">Maintenance Costs</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fa-solid fa-user-tie"></i></div>
                <div>
                    <div class="stat-value">${stats.payroll_costs}</div>
                    <div class="stat-label">Payroll &amp; Wages</div>
                </div>
            </div>
        `;
    }
    
    statsContainer.innerHTML = cardsHTML;
}

// 8. Render Database Scoped Data Table
function renderTable(role, data) {
    if (!data || data.length === 0) {
        tableRows.innerHTML = `<tr><td colspan="10" class="text-center">No records found in database.</td></tr>`;
        return;
    }
    
    let headersHTML = '';
    let rowsHTML = '';
    
    if (role === 'Fleet Manager') {
        panelTitleText.innerText = "Fleet Register & Status";
        headersHTML = `
            <th>ID</th>
            <th>Vehicle Model</th>
            <th>Status</th>
            <th>Fuel level</th>
            <th>Last Service</th>
            <th>Mileage (mi)</th>
        `;
        data.forEach(item => {
            const statusSlug = item.status.toLowerCase().replace(/ /g, '-');
            rowsHTML += `
                <tr>
                    <td><strong>#VEH-0${item.id}</strong></td>
                    <td>${item.vehicle_name}</td>
                    <td><span class="status-pill ${statusSlug}">${item.status}</span></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${item.fuel_level}%</span>
                            <div style="width: 60px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow:hidden;">
                                <div style="width: ${item.fuel_level}%; height: 100%; background: ${item.fuel_level < 20 ? 'var(--color-error)' : 'var(--color-success)'}"></div>
                            </div>
                        </div>
                    </td>
                    <td>${item.last_service}</td>
                    <td>${item.mileage.toLocaleString()} mi</td>
                </tr>
            `;
        });
    } else if (role === 'Dispatcher') {
        panelTitleText.innerText = "Assigned Transit Trips";
        headersHTML = `
            <th>Trip Code</th>
            <th>Driver Name</th>
            <th>Vehicle</th>
            <th>Destination</th>
            <th>Status</th>
            <th>ETA</th>
        `;
        data.forEach(item => {
            const statusSlug = item.status.toLowerCase().replace(/ /g, '-');
            rowsHTML += `
                <tr>
                    <td><strong>${item.trip_id}</strong></td>
                    <td>${item.driver_name}</td>
                    <td>${item.vehicle_name}</td>
                    <td>${item.destination}</td>
                    <td><span class="status-pill ${statusSlug}">${item.status}</span></td>
                    <td>${item.eta}</td>
                </tr>
            `;
        });
    } else if (role === 'Safety Officer') {
        panelTitleText.innerText = "Driver Performance & Audits";
        headersHTML = `
            <th>Driver</th>
            <th>License Number</th>
            <th>Safety Score</th>
            <th>Work Status</th>
            <th>Compliance Audits</th>
        `;
        data.forEach(item => {
            const statusSlug = item.status.toLowerCase().replace(/ /g, '-');
            const scoreColor = item.safety_score > 85 ? 'var(--color-success)' : (item.safety_score > 60 ? 'var(--color-warning)' : 'var(--color-error)');
            const complianceClass = item.compliance_check === 'Passed' ? 'status-pill active' : (item.compliance_check === 'Due' ? 'status-pill maintenance' : 'status-pill out-of-service');
            rowsHTML += `
                <tr>
                    <td><strong>${item.driver_name}</strong></td>
                    <td><code>${item.license_number}</code></td>
                    <td><span style="font-weight: 700; color: ${scoreColor}">${item.safety_score}/100</span></td>
                    <td><span class="status-pill ${statusSlug}">${item.status}</span></td>
                    <td><span class="${complianceClass}">${item.compliance_check}</span></td>
                </tr>
            `;
        });
    } else if (role === 'Financial Analyst') {
        panelTitleText.innerText = "Expense Outlay & Ledger";
        headersHTML = `
            <th>Transaction ID</th>
            <th>Category</th>
            <th>Outflow Amount</th>
            <th>Date</th>
            <th>Description</th>
        `;
        data.forEach(item => {
            rowsHTML += `
                <tr>
                    <td><strong>#TXN-${item.id + 1040}</strong></td>
                    <td><span class="badge ${item.category === 'Fuel' ? 'financial-analyst' : (item.category === 'Maintenance' ? 'fleet-manager' : 'dispatcher')}">${item.category}</span></td>
                    <td style="font-weight: 700; color: var(--color-error)">$${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td>${item.date}</td>
                    <td class="text-muted">${item.description}</td>
                </tr>
            `;
        });
    }
    
    tableHeaders.innerHTML = headersHTML;
    tableRows.innerHTML = rowsHTML;
}

// 9. Render Dynamic Interactive Dashboard Charts / Meters
function renderVisualizations(role, data) {
    let containerHTML = '';
    
    if (role === 'Fleet Manager') {
        containerHTML = `
            <div class="visual-panel">
                <h4>Fuel Depletion Monitor</h4>
                <div class="meters-list">
                    ${data.map(v => `
                        <div class="meter-row">
                            <div class="meter-info">
                                <span>${v.vehicle_name}</span>
                                <span>${v.fuel_level}%</span>
                            </div>
                            <div class="meter-track">
                                <div class="meter-fill ${v.fuel_level < 20 ? 'red' : (v.fuel_level < 60 ? 'orange' : 'green')}" style="width: ${v.fuel_level}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="visual-panel">
                <h4>Fleet Utilization Analytics</h4>
                <div class="chart-container">
                    ${data.map(v => {
                        const height = Math.min(100, Math.max(10, v.mileage / 1100));
                        return `
                            <div class="chart-bar-wrapper">
                                <div class="chart-bar" style="height: ${height}%; background-color: var(--color-info);" data-val="${v.mileage.toLocaleString()} mi"></div>
                                <div class="chart-label">${v.vehicle_name.split(' ')[0]}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } else if (role === 'Dispatcher') {
        const liveTrips = data.filter(t => t.status === 'In Transit');
        containerHTML = `
            <div class="visual-panel">
                <h4>Active Trip Routing Summary</h4>
                <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1.5rem;">Estimated progress to destinations</p>
                <div class="meters-list">
                    ${liveTrips.length === 0 ? '<p class="text-center text-muted">No trips currently in transit.</p>' : 
                      liveTrips.map(t => {
                          const randomProgress = t.trip_id === 'TRIP-9904' ? 65 : 30;
                          return `
                            <div class="meter-row">
                                <div class="meter-info">
                                    <span>${t.trip_id} to ${t.destination}</span>
                                    <span>ETA: ${t.eta}</span>
                                </div>
                                <div class="meter-track">
                                    <div class="meter-fill purple" style="width: ${randomProgress}%"></div>
                                </div>
                            </div>
                          `;
                      }).join('')
                    }
                </div>
            </div>
            
            <div class="visual-panel">
                <h4>Trip Dispatch Statistics</h4>
                <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1rem;">Comparison of operations workflow statuses</p>
                <div class="chart-container" style="height: 180px;">
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: ${ (data.filter(t => t.status === 'In Transit').length / data.length) * 100 }%; background-color: var(--color-info);" data-val="${data.filter(t => t.status === 'In Transit').length}"></div>
                        <div class="chart-label">In Transit</div>
                    </div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: ${ (data.filter(t => t.status === 'Scheduled').length / data.length) * 100 }%; background-color: var(--color-purple);" data-val="${data.filter(t => t.status === 'Scheduled').length}"></div>
                        <div class="chart-label">Scheduled</div>
                    </div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: ${ (data.filter(t => t.status === 'Completed').length / data.length) * 100 }%; background-color: var(--color-success);" data-val="${data.filter(t => t.status === 'Completed').length}"></div>
                        <div class="chart-label">Completed</div>
                    </div>
                </div>
            </div>
        `;
    } else if (role === 'Safety Officer') {
        containerHTML = `
            <div class="visual-panel">
                <h4>Driver Safety Ratings</h4>
                <div class="meters-list">
                    ${data.map(d => `
                        <div class="meter-row">
                            <div class="meter-info">
                                <span>${d.driver_name}</span>
                                <span style="color: ${d.safety_score > 85 ? 'var(--color-success)' : (d.safety_score > 60 ? 'var(--color-warning)' : 'var(--color-error)')}; font-weight: 700;">${d.safety_score}/100</span>
                            </div>
                            <div class="meter-track">
                                <div class="meter-fill ${d.safety_score > 85 ? 'green' : (d.safety_score > 60 ? 'amber' : 'red')}" style="width: ${d.safety_score}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="visual-panel">
                <h4>Compliance Audit Breakdown</h4>
                <div class="chart-container">
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: ${(data.filter(d => d.compliance_check === 'Passed').length / data.length) * 100}%; background-color: var(--color-success);" data-val="${data.filter(d => d.compliance_check === 'Passed').length} Passed"></div>
                        <div class="chart-label">Passed Audit</div>
                    </div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: ${(data.filter(d => d.compliance_check === 'Due').length / data.length) * 100}%; background-color: var(--color-warning);" data-val="${data.filter(d => d.compliance_check === 'Due').length} Due"></div>
                        <div class="chart-label">Audit Due</div>
                    </div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="height: ${(data.filter(d => d.compliance_check === 'Failed').length / data.length) * 100}%; background-color: var(--color-error);" data-val="${data.filter(d => d.compliance_check === 'Failed').length} Failed"></div>
                        <div class="chart-label">Failed Audit</div>
                    </div>
                </div>
            </div>
        `;
    } else if (role === 'Financial Analyst') {
        // Calculate category sums
        const sums = {};
        data.forEach(e => {
            sums[e.category] = (sums[e.category] || 0) + e.amount;
        });
        const categories = Object.keys(sums);
        const maxVal = Math.max(...Object.values(sums));
        
        containerHTML = `
            <div class="visual-panel">
                <h4>Expense Breakdown</h4>
                <div class="meters-list">
                    ${categories.map(cat => {
                        const sum = sums[cat];
                        const total = Object.values(sums).reduce((a, b) => a + b, 0);
                        const percent = ((sum / total) * 100).toFixed(0);
                        const color = cat === 'Fuel' ? 'red' : (cat === 'Maintenance' ? 'orange' : 'purple');
                        return `
                            <div class="meter-row">
                                <div class="meter-info">
                                    <span>${cat} Cost</span>
                                    <span>$${sum.toLocaleString()} (${percent}%)</span>
                                </div>
                                <div class="meter-track">
                                    <div class="meter-fill ${color}" style="width: ${percent}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="visual-panel">
                <h4>Financial Outlays Comparison</h4>
                <div class="chart-container">
                    ${categories.map(cat => {
                        const sum = sums[cat];
                        const height = (sum / maxVal) * 100;
                        const color = cat === 'Fuel' ? 'var(--color-error)' : (cat === 'Maintenance' ? 'var(--color-primary)' : 'var(--color-purple)');
                        return `
                            <div class="chart-bar-wrapper">
                                <div class="chart-bar" style="height: ${height}%; background-color: ${color};" data-val="$${sum.toLocaleString()}"></div>
                                <div class="chart-label">${cat}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    visualizationSection.innerHTML = containerHTML;
}
