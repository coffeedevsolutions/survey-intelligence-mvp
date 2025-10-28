import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Users, UserPlus, Share2 } from '../../../components/ui/icons';
import { UsersTab } from '../users/UsersTab';
import { InvitesTab } from '../users/InvitesTab';
import { SharesTab } from '../users/SharesTab';

/**
 * User Management Tab Component for Enterprise Organization Settings
 * Wraps the existing Users, Invites, and Shares tabs
 */
export function UserManagementTab({ user, users, seatInfo, invites, shareLinks, updateUserRole, deleteUser, createInvite, createShareLink, revokeShareLink }) {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="invites">
            <UserPlus className="w-4 h-4 mr-2" />
            Invites
          </TabsTrigger>
          <TabsTrigger value="shares">
            <Share2 className="w-4 h-4 mr-2" />
            Share Links
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UsersTab 
            users={users}
            seatInfo={seatInfo}
            onUpdateUserRole={updateUserRole}
            onDeleteUser={deleteUser}
            onCreateInvite={createInvite}
            currentUser={user}
          />
        </TabsContent>

        <TabsContent value="invites" className="mt-6">
          <InvitesTab invites={invites} />
        </TabsContent>

        <TabsContent value="shares" className="mt-6">
          <SharesTab
            shareLinks={shareLinks}
            onCreateShareLink={createShareLink}
            onRevokeShareLink={revokeShareLink}
            user={user}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

