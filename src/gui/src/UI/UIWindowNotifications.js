/**
 * Copyright (C) 2024-present Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import UIWindow from './UIWindow.js'
import UIAlert from './UIAlert.js'

/**
 * Creates a notification sidebar that displays the user's notification history
 * 
 * @param {Object} options - Configuration options for the sidebar
 * @returns {HTMLElement} - The sidebar element
 */
function UIWindowNotifications(options = {}) {
    // Check if sidebar already exists
    if ($('.notification-sidebar').length) {
        $('.notification-sidebar').addClass('active');
        return $('.notification-sidebar')[0];
    }

    let h = '';
    let el_sidebar;
    
    // Create sidebar structure
    h += `<div class="notification-sidebar">`;
    h += `<div class="notification-sidebar-header">`;
    h += `<div class="notification-sidebar-title">Notifications</div>`;
    h += `<div class="notification-sidebar-close">`;
    h += `<img src="${window.icons['close.svg']}" alt="Close" style="width: 12px; height: 12px; opacity: 0.7;">`;
    h += `</div>`;
    h += `</div>`;
    h += `<div class="notification-sidebar-content">`;
    
    // Container for notifications without loading state
    h += `<div class="notification-history-container">`;
    h += `<div class="notification-history-list"></div>`;
    h += `<div class="notification-history-empty" style="display: none;">
            <p>You don't have any notifications yet.</p>
          </div>`;
    h += `<div class="notification-load-more" style="display: none;">Load more notifications...</div>`;
    h += `</div>`;
    
    h += `</div>`; 
    h += `</div>`; 
    
    // Append sidebar to body
    $('body').append(h);
    el_sidebar = $('.notification-sidebar')[0];
    
    // Show sidebar with animation
    requestAnimationFrame(() => {
        $(el_sidebar).addClass('active');
    });

    // Notification state
    let currentPage = 1;
    let isLoading = false;
    let hasMoreNotifications = false;
    let pageSize = 20;
    let notificationInterval = null;
    let hasLoadedInitially = false;
    
    // Function to render notifications
    function renderNotifications(notifications, append = false) {
        const container = $(el_sidebar).find('.notification-history-list');
        const emptyState = $(el_sidebar).find('.notification-history-empty');
        
        if (!append) {
            container.empty();
        }
        
        // Check for empty state
        if (!notifications || notifications.length === 0) {
            if (!append && !hasLoadedInitially) {
                // Show placeholder notifications only on initial empty load
                const placeholderNotifications = [
                    {
                        uid: 'placeholder-1',
                        notification: {
                            title: 'Welcome to Puter',
                            text: 'Thanks for joining! Explore our features and get started with cloud storage.',
                            icon: 'info.svg'
                        },
                        created_at: Math.floor(Date.now() / 1000),
                        read: false
                    },
                    {
                        uid: 'placeholder-2',
                        notification: {
                            title: 'File Shared Successfully',
                            text: 'Your document "example.pdf" has been shared with collaborator@example.com',
                            icon: 'share.svg'
                        },
                        created_at: Math.floor(Date.now() / 1000) - 3600,
                        read: true
                    },
                    {
                        uid: 'placeholder-3',
                        notification: {
                            title: 'Storage Space Alert',
                            text: 'You\'re approaching your storage limit. Consider upgrading your plan.',
                            icon: 'warning.svg'
                        },
                        created_at: Math.floor(Date.now() / 1000) - 7200,
                        read: false
                    }
                ];
                
                container.hide();
                emptyState.show();
                renderNotifications(placeholderNotifications, false);
            }
            $(el_sidebar).find('.notification-load-more').hide();
            hasMoreNotifications = false;
            return;
        }

        // Hide empty state if we have notifications
        emptyState.hide();
        container.show();
        
        // Render notifications
        notifications.forEach(item => {
            const notif = item.notification;
            const date = new Date(item.created_at * 1000).toLocaleString();
            const isPlaceholder = item.uid.startsWith('placeholder-');
            
            const notifEl = $(`
                <div class="notification-history-item ${item.read ? 'read' : 'unread'}" data-uid="${item.uid}">
                    <div class="notification-header">
                        <div class="notification-icon">
                            <img src="${window.icons[notif.icon] || window.icons['bell.svg']}" alt="Notification">
                        </div>
                        <div class="notification-title">
                            ${notif.title || 'Notification'}
                        </div>
                        <div class="notification-date">
                            ${date}
                        </div>
                    </div>
                    <div class="notification-text">${notif.text || ''}</div>
                    <div class="notification-status">
                        ${item.read ? 
                            '<span class="read-status">Read</span>' : 
                            '<span class="unread-status">Unread</span>'
                        }
                    </div>
                </div>
            `);
            
            // Only attach click handler if it's not a placeholder or if it's an unread placeholder
            if (!isPlaceholder || !item.read) {
                notifEl.on('click', async function() {
                    if (!item.read) {
                        try {
                            // For real notifications, make the API call
                            if (!isPlaceholder) {
                                await fetch(`${window.api_origin}/notif/mark-read`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${window.auth_token}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ uid: item.uid })
                                });
                            }
                            
                            // Update UI state
                            $(this).removeClass('unread').addClass('read');
                            $(this).find('.notification-status').html('<span class="read-status">Read</span>');
                            item.read = true;
                            
                            // Update notification badge count
                            if (!isPlaceholder) {
                                window.update_notification_badge_count();
                            }
                            
                            // Animate the transition
                            $(this).css({
                                'transition': 'background-color 0.3s ease',
                                'background-color': 'rgba(76, 175, 80, 0.1)'
                            });
                            setTimeout(() => {
                                $(this).css({
                                    'background-color': '',
                                    'transition': ''
                                });
                            }, 300);
                            
                        } catch (error) {
                            console.error('Failed to mark notification as read:', error);
                            if (!isPlaceholder) {
                                UIAlert({
                                    message: 'Failed to mark notification as read. Please try again.',
                                    buttons: [{
                                        label: 'OK'
                                    }]
                                });
                            }
                        }
                    }
                });
            }
            
            container.append(notifEl);
        });
        
        // Update load more button visibility
        $(el_sidebar).find('.notification-load-more').toggle(hasMoreNotifications);
        hasLoadedInitially = true;
    }
    
    // Function to load notifications
    async function loadNotifications(page = 1, append = false) {
        if (isLoading) return;
        
        try {
            isLoading = true;
            
            // Fetch notifications from the API
            const response = await fetch(`${window.api_origin}/notif/history?page=${page}&pageSize=${pageSize}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.auth_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update pagination state
            currentPage = data.pagination.page;
            hasMoreNotifications = currentPage < data.pagination.totalPages;
            
            // Render notifications
            renderNotifications(data.notifications, append);
            
        } catch (error) {
            console.error('Failed to load notifications:', error);
            if (!append) {
                // Show error only for initial load
                UIAlert({
                    message: 'Failed to load notifications. Please try again.',
                    buttons: [{
                        label: 'OK'
                    }]
                });
            }
            $(el_sidebar).find('.notification-load-more').hide();
        } finally {
            isLoading = false;
        }
    }
    
    // Handle load more button click
    $(el_sidebar).find('.notification-load-more').on('click', function() {
        if (!isLoading && hasMoreNotifications) {
            loadNotifications(currentPage + 1, true);
        }
    });
    
    // Setup periodic notification check
    function startNotificationInterval() {
        // Clear any existing interval
        if (notificationInterval) {
            clearInterval(notificationInterval);
        }
        
        // Set new interval to check for notifications every 30 seconds
        notificationInterval = setInterval(() => {
            if (!isLoading) {
                loadNotifications(1, false);
            }
        }, 30000); // 30 seconds
    }
    
    // Cleanup function
    function cleanup() {
        if (notificationInterval) {
            clearInterval(notificationInterval);
        }
        $(document).off('mousedown.notification-sidebar');
    }
    
    // Update close handlers to include cleanup
    $(el_sidebar).find('.notification-sidebar-close').on('click', () => {
        cleanup();
        $(el_sidebar).removeClass('active');
        setTimeout(() => {
            $(el_sidebar).remove();
        }, 300);
    });
    
    $(document).on('mousedown.notification-sidebar', (e) => {
        if (!$(e.target).closest('.notification-sidebar').length && 
            !$(e.target).closest('.notifications-history-btn').length) {
            cleanup();
            $(el_sidebar).removeClass('active');
            setTimeout(() => {
                $(el_sidebar).remove();
            }, 300);
            $(document).off('mousedown.notification-sidebar');
        }
    });
    
    // Load initial notifications and start interval
    loadNotifications(1, false);
    startNotificationInterval();
    
    return el_sidebar;
}

export default UIWindowNotifications;