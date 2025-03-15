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
    
    // Container for notifications with loading state
    h += `<div class="notification-history-container">`;
    h += `<div class="notification-history-loading">Loading notifications...</div>`;
    h += `<div class="notification-history-list" style="display: none;"></div>`;
    h += `<div class="notification-history-empty" style="display: none;">
            <p>You don't have any notifications yet.</p>
          </div>`;
    h += `<div class="notification-load-more" style="display: none;">
            <div class="notification-load-more-spinner"></div>
            Loading more notifications...
          </div>`;
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

    // Handle close button click
    $(el_sidebar).find('.notification-sidebar-close').on('click', () => {
        $(el_sidebar).removeClass('active');
        setTimeout(() => {
            $(el_sidebar).remove();
        }, 300);
    });

    // Handle click outside sidebar
    $(document).on('mousedown.notification-sidebar', (e) => {
        if (!$(e.target).closest('.notification-sidebar').length && 
            !$(e.target).closest('.notifications-history-btn').length) {
            $(el_sidebar).removeClass('active');
            setTimeout(() => {
                $(el_sidebar).remove();
            }, 300);
            $(document).off('mousedown.notification-sidebar');
        }
    });
    
    // Notification state
    let currentPage = 1;
    let isLoading = false;
    let hasMoreNotifications = true;
    let pageSize = 20;
    
    // Function to render notifications
    function renderNotifications(notifications, append = false) {
        const container = $(el_sidebar).find('.notification-history-list');
        
        if (!append) {
            container.empty();
        }
        
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
        
        // Hide loading and show content
        $(el_sidebar).find('.notification-history-loading').hide();
        $(el_sidebar).find('.notification-history-list').show();
        
        // Update load more visibility
        $(el_sidebar).find('.notification-load-more').toggle(hasMoreNotifications);
    }
    
    // Function to load notifications
    async function loadNotifications(page = 1, append = false) {
        if (isLoading) return;
        
        try {
            isLoading = true;
            
            if (!append) {
                // Show initial loading state
                $(el_sidebar).find('.notification-history-loading').show();
                $(el_sidebar).find('.notification-history-list').hide();
                $(el_sidebar).find('.notification-history-empty').hide();
            } else {
                // Show load more spinner
                $(el_sidebar).find('.notification-load-more').show();
            }
            
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
            
            // Check if there are any notifications
            if (!data.notifications || (data.notifications.length === 0 && !append)) {
                // Show placeholder notifications if no real notifications exist
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
                
                renderNotifications(placeholderNotifications, false);
                return;
            }
            
            // Render actual notifications
            renderNotifications(data.notifications, append);
            
        } catch (error) {
            console.error('Failed to load notifications:', error);
            UIAlert({
                message: 'Failed to load notifications. Please try again.',
                buttons: [{
                    label: 'OK'
                }]
            });
            $(el_sidebar).find('.notification-history-loading').hide();
            $(el_sidebar).find('.notification-load-more').hide();
        } finally {
            isLoading = false;
        }
    }
    
    // Handle infinite scroll
    const container = $(el_sidebar).find('.notification-history-container');
    container.on('scroll', function() {
        const scrollHeight = this.scrollHeight;
        const scrollTop = this.scrollTop;
        const clientHeight = this.clientHeight;
        
        // Load more when user scrolls near bottom
        if (scrollHeight - scrollTop - clientHeight < 100 && hasMoreNotifications && !isLoading) {
            loadNotifications(currentPage + 1, true);
        }
    });
    
    // Load initial notifications
    loadNotifications(1, false);
    
    return el_sidebar;
}

export default UIWindowNotifications;