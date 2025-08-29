import React, { useState } from 'react';
import { 
  BarChart3, 
  FileText, 
  Megaphone, 
  Users, 
  Archive, 
  Building2,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Mail,
  Share2,
  Server,
  Layers
} from '../ui/icons';

/**
 * Modern Sidebar Navigation Component
 */
export function Sidebar({ activeSection, onSectionChange, user }) {
  const [expandedSections, setExpandedSections] = useState({
    briefs: false,
    admin: false,
    archive: false,
    enterprise: false
  });

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleNavigation = (sectionId, subsectionId = null) => {
    onSectionChange(subsectionId || sectionId);
  };

  // Navigation structure
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      roles: ['admin', 'reviewer', 'member']
    },
    {
      id: 'surveys',
      label: 'Surveys',
      icon: FileText,
      roles: ['admin', 'reviewer', 'member']
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: Megaphone,
      roles: ['admin', 'reviewer', 'member']
    },
    {
      id: 'briefs',
      label: 'Briefs & Reviews',
      icon: FileText,
      expandable: true,
      expandedKey: 'briefs',
      roles: ['admin', 'reviewer'],
      subsections: [
        { id: 'briefs', label: 'Briefs', roles: ['admin', 'reviewer', 'member'] },
        { id: 'review', label: 'Reviews', roles: ['admin', 'reviewer'] }
      ]
    },
    {
      id: 'admin',
      label: 'Administration',
      icon: Users,
      expandable: true,
      expandedKey: 'admin',
      roles: ['admin'],
      subsections: [
        { id: 'users', label: 'Team Members & Seats', roles: ['admin'] },
        { id: 'invites', label: 'Invitations', roles: ['admin'] },
        { id: 'shares', label: 'Share Links', roles: ['admin'] }
      ]
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      expandable: true,
      expandedKey: 'archive',
      roles: ['admin'],
      subsections: [
        { id: 'archived-campaigns', label: 'Archived Campaigns', roles: ['admin'] },
        { id: 'archived-surveys', label: 'Archived Surveys', roles: ['admin'] }
      ]
    },
    {
      id: 'enterprise',
      label: 'Enterprise',
      icon: Building2,
      expandable: true,
      expandedKey: 'enterprise',
      roles: ['admin'],
      subsections: [
        { id: 'stack', label: 'Tech Stack', roles: ['admin'] },
        { id: 'solutions', label: 'Solutions', roles: ['admin'] }
      ]
    }
  ];

  const hasRole = (roles) => {
    return roles.includes(user?.role);
  };

  const getSubsectionIcon = (subsectionId) => {
    const iconMap = {
      'users': UserCheck,
      'invites': Mail,
      'shares': Share2,
      'stack': Server,
      'solutions': Layers,
      'archived-campaigns': Megaphone,
      'archived-surveys': FileText,
      'briefs': FileText,
      'review': FileText
    };
    return iconMap[subsectionId] || FileText;
  };

  return (
    <div className="w-72 min-h-screen bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50 shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <span className="text-lg font-bold text-gray-900 tracking-tight">Survey Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 overflow-y-auto">
        {navigationItems.map((item) => {
          if (!hasRole(item.roles)) return null;

          const Icon = item.icon;
          const isExpanded = expandedSections[item.expandedKey];
          const isActive = activeSection === item.id || 
            (item.subsections && item.subsections.some(sub => sub.id === activeSection));

          return (
            <div key={item.id} className="mb-1">
              <div
                className={`flex items-center justify-between px-5 py-3 mx-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-gray-700 hover:bg-gray-100 hover:translate-x-0.5'
                }`}
                onClick={() => {
                  if (item.expandable) {
                    toggleSection(item.expandedKey);
                  } else {
                    handleNavigation(item.id);
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium whitespace-nowrap ${isActive ? 'text-white' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                </div>
                {item.expandable && (
                  <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                )}
              </div>

              {/* Subsections */}
              {item.expandable && isExpanded && item.subsections && (
                <div className="ml-5 mt-1 border-l-2 border-gray-200 pl-0 animate-slideDown">
                  {item.subsections.map((subsection) => {
                    if (!hasRole(subsection.roles)) return null;

                    const SubIcon = getSubsectionIcon(subsection.id);
                    const isSubActive = activeSection === subsection.id;

                    return (
                      <div
                        key={subsection.id}
                        className={`flex items-center gap-2.5 py-2 px-4 mr-2 mb-0.5 rounded-md cursor-pointer transition-all duration-200 relative ${
                          isSubActive 
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md shadow-green-500/30' 
                            : 'text-gray-600 hover:bg-gray-50 hover:translate-x-0.5'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigation(item.id, subsection.id);
                        }}
                      >
                        <div className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-0.5 h-4 transition-colors duration-200 ${
                          isSubActive ? 'bg-green-500' : 'bg-transparent'
                        }`} style={{ marginLeft: '-2px' }} />
                        <SubIcon className={`w-4 h-4 flex-shrink-0 ${isSubActive ? 'text-white' : 'text-gray-400'}`} />
                        <span className={`text-xs font-medium whitespace-nowrap ${isSubActive ? 'text-white' : 'text-gray-600'}`}>
                          {subsection.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-5 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">
              {user?.email}
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-0.5">
              {user?.role}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
