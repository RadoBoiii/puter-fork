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
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { LogService } from '/Users/sriujjwalreddyb/puter-fork/src/backend/src/modules/core/LogService.js';

const DEBUG = true;

// Create a logger instance for notifications
const notifLogger = new LogService().create('NOTIF');

// Replace the debugLog function with this
function debugLog(...args) {
    if (DEBUG) {
        notifLogger.debug(args[0], {
            data: args.slice(1),
            timestamp: new Date().toISOString(),
            component: 'UIWindowNotifications'
        });
    }
}

/**
 * Creates a notification sidebar that displays the user's notification history
 * 
 * @param {Object} options - Configuration options for the sidebar
 * @returns {HTMLElement} - The sidebar element
 */
function UIWindowNotifications(options = {}) {
    notifLogger.info('Creating notification sidebar', { options });

    // Check if sidebar already exists
    if ($('.notification-sidebar').length) {
        notifLogger.debug('Sidebar already exists, activating');
        $('.notification-sidebar').addClass('active');
        return $('.notification-sidebar')[0];
    }

    let h = '';
    let el_sidebar;
    
    // Create sidebar structure - WITHOUT loading states
    h += `<div class="notification-sidebar">`;
    h += `<div class="notification-sidebar-header">`;
    h += `<div class="notification-sidebar-title">Notifications</div>`;
    h += `<div class="notification-sidebar-close">`;
    h += `<img src="${window.icons['close.svg']}" alt="Close" style="width: 12px; height: 12px; opacity: 0.7;">`;
    h += `</div>`;
    h += `</div>`;
    h += `<div class="notification-sidebar-content">`;
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
    
    // Immediately remove any loading states and ensure list is visible
    $('.notification-history-loading').remove(); // Remove loading div completely
    $('.notification-history-list').show(); // Force show the list
    $('.notification-load-more-spinner').remove(); // Remove spinner
    
    // Notification state
    let currentPage = 1;
    let hasMoreNotifications = true;
    let pageSize = 20;
    
    // Function to render notifications
    function renderNotifications(notifications, append = false) {
        notifLogger.group('Render Notifications');
        notifLogger.debug('Starting render', {
            notificationCount: notifications?.length,
            append,
            containerExists: $(el_sidebar).find('.notification-history-list').length > 0
        });
        
        const container = $(el_sidebar).find('.notification-history-list');
        const emptyState = $(el_sidebar).find('.notification-history-empty');
        
        debugLog('Initial DOM state:', {
            containerExists: container.length > 0,
            emptyStateExists: emptyState.length > 0,
            containerVisible: container.is(':visible'),
            emptyStateVisible: emptyState.is(':visible')
        });

        // Force remove loading state
        $('.notification-history-loading').remove();
        
        // Always show container initially
        container.show();
        emptyState.hide();
        
        if (!append) {
            debugLog('Clearing container');
            container.empty();
        }
        
        if (!notifications || notifications.length === 0) {
            notifLogger.info('No notifications, rendering placeholders');
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
            
            debugLog('Rendering placeholders:', placeholderNotifications);
            
            // Render placeholders directly
            placeholderNotifications.forEach((item, index) => {
                debugLog(`Rendering placeholder ${index + 1}:`, item);
                const notifEl = $(`
                    <div class="notification-history-item ${item.read ? 'read' : 'unread'}" data-uid="${item.uid}">
                        <div class="notification-header">
                            <div class="notification-icon">
                                <img src="${window.icons[item.notification.icon] || window.icons['bell.svg']}" alt="Notification">
                            </div>
                            <div class="notification-title">
                                ${item.notification.title || 'Notification'}
                            </div>
                            <div class="notification-date">
                                ${new Date(item.created_at * 1000).toLocaleString()}
                            </div>
                        </div>
                        <div class="notification-text">${item.notification.text || ''}</div>
                        <div class="notification-status">
                            ${item.read ? 
                                '<span class="read-status">Read</span>' : 
                                '<span class="unread-status">Unread</span>'
                            }
                        </div>
                    </div>
                `);
                container.append(notifEl);
            });
            
            $(el_sidebar).find('.notification-load-more').hide();
            debugLog('=== RENDER NOTIFICATIONS END (Placeholders) ===');
            return;
        }

        debugLog('Rendering notifications:', notifications);
        emptyState.hide();
        container.show();
        
        notifications.forEach((item, index) => {
            notifLogger.debug(`Rendering notification ${index + 1}`, {
                uid: item.uid,
                title: item.notification?.title,
                isRead: item.read
            });
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
            
            // Click handler for notifications
            if (!isPlaceholder || !item.read) {
                notifEl.on('click', async function() {
                    if (!item.read) {
                        try {
                            if (!isPlaceholder) {
                                const db = await open({
                                    filename: '/Users/sriujjwalreddyb/puter-fork/volatile/runtime/puter-database.sqlite',
                                    driver: sqlite3.Database
                                });

                                const timestamp = Math.floor(Date.now() / 1000);
                                await db.run(
                                    'UPDATE notification SET acknowledged = ? WHERE uid = ? AND user_id = ?',
                                    timestamp,
                                    item.uid,
                                    window.user.id
                                );

                                await db.close();
                            }
                            
                            // Update UI state
                            $(this).removeClass('unread').addClass('read');
                            $(this).find('.notification-status').html('<span class="read-status">Read</span>');
                            item.read = true;
                            
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
                            UIAlert({
                                message: 'Failed to mark notification as read. Please try again.',
                                buttons: [{ label: 'OK' }]
                            });
                        }
                    }
                });
            }
            
            container.append(notifEl);
        });
        
        $(el_sidebar).find('.notification-load-more').toggle(hasMoreNotifications);
        debugLog('Final render state:', {
            containerVisible: container.is(':visible'),
            emptyStateVisible: emptyState.is(':visible'),
            loadMoreVisible: $(el_sidebar).find('.notification-load-more').is(':visible')
        });
        notifLogger.debug('Render complete', {
            hasMore: hasMoreNotifications,
            currentPage,
            visibleNotifications: $(el_sidebar).find('.notification-history-item').length
        });
        notifLogger.groupEnd();
    }
    
    // Function to load notifications
    async function loadNotifications(page = 1, append = false) {
        notifLogger.group('Load Notifications');
        notifLogger.info('Loading notifications', {
            page,
            append,
            userId: window.user?.id
        });

        try {
            if (!window.user?.id) {
                notifLogger.error('No user ID found');
                throw new Error('User ID not found');
            }

            const db = await open({
                filename: '/Users/sriujjwalreddyb/puter-fork/volatile/runtime/puter-database.sqlite',
                driver: sqlite3.Database
            });
            notifLogger.debug('Database connection opened');

            const countResult = await db.get(
                'SELECT COUNT(*) as total FROM notification WHERE user_id = ?',
                window.user.id
            );
            notifLogger.info('Notification count', { total: countResult?.total });

            if (!countResult || countResult.total === 0) {
                notifLogger.info('No notifications found, showing placeholders');
                await db.close();
                renderNotifications([], false); // This will trigger placeholder display
                return;
            }

            const offset = (page - 1) * pageSize;
            const totalPages = Math.ceil(countResult.total / pageSize);

            // Get notifications
            const notifications = await db.all(
                `SELECT uid, value, created_at, acknowledged, shown 
                 FROM notification 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ? OFFSET ?`,
                window.user.id,
                pageSize,
                offset
            );
            notifLogger.debug('Retrieved notifications', {
                count: notifications?.length,
                page,
                pageSize
            });

            if (!notifications || notifications.length === 0) {
                notifLogger.info('No notifications returned from query, showing placeholders');
                await db.close();
                renderNotifications([], false);
                return;
            }

            // Format notifications
            const formattedNotifications = notifications.map(notif => {
                try {
                    return {
                        uid: notif.uid,
                        notification: JSON.parse(notif.value),
                        created_at: Math.floor(new Date(notif.created_at).getTime() / 1000),
                        read: !!notif.acknowledged
                    };
                } catch (parseError) {
                    console.error('Failed to parse notification:', notif, parseError);
                    return null;
                }
            }).filter(Boolean);

            // Update pagination state
            currentPage = page;
            hasMoreNotifications = page < totalPages;

            // Render notifications
            renderNotifications(formattedNotifications, append);

            await db.close();
            
        } catch (error) {
            notifLogger.error('Failed to load notifications', {
                error: error.message,
                stack: error.stack
            });
            renderNotifications([], false);
        } finally {
            notifLogger.groupEnd();
        }
    }
    
    // Handle load more button click
    $(el_sidebar).find('.notification-load-more').on('click', function() {
        notifLogger.debug('Load more clicked', {
            currentPage,
            hasMore: hasMoreNotifications
        });
        if (hasMoreNotifications) {
            loadNotifications(currentPage + 1, true);
        }
    });
    
    // Handle infinite scroll
    const container = $(el_sidebar).find('.notification-history-container');
    container.on('scroll', function() {
        const scrollHeight = this.scrollHeight;
        const scrollTop = this.scrollTop;
        const clientHeight = this.clientHeight;
        
        if (scrollHeight - scrollTop - clientHeight < 100 && hasMoreNotifications) {
            loadNotifications(currentPage + 1, true);
        }
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
    
    // Load initial notifications
    loadNotifications(1, false);
    
    // After creating sidebar
    $('body').append(h);
    el_sidebar = $('.notification-sidebar')[0];
    
    notifLogger.info('Sidebar initialization complete', {
        exists: !!el_sidebar,
        elements: {
            list: $(el_sidebar).find('.notification-history-list').length,
            empty: $(el_sidebar).find('.notification-history-empty').length
        }
    });

    // Force cleanup of loading states
    $('.notification-history-loading').remove();
    $('.notification-history-list').show();
    $('.notification-load-more-spinner').remove();
    
    return el_sidebar;
}

export default UIWindowNotifications;