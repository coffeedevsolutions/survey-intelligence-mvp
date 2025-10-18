import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';

const TopCampaignsTable = ({ data }) => {
  const campaignsData = data?.topActiveCampaigns || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Active Campaigns</CardTitle>
        <CardDescription>Highest performing intake campaigns</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead className="text-right">Requests</TableHead>
              <TableHead className="text-right">Conv.</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaignsData.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>{campaign.name}</TableCell>
                <TableCell className="text-muted-foreground">{campaign.purpose || 'N/A'}</TableCell>
                <TableCell className="text-right">{campaign.requests}</TableCell>
                <TableCell className="text-right">{campaign.conversion_rate}%</TableCell>
                <TableCell>
                  <Badge 
                    className={
                      campaign.status === "Active"
                        ? "bg-green-100 !text-green-900 border-green-200"
                        : "bg-gray-100 !text-gray-800 border-gray-200"
                    }
                  >
                    {campaign.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TopCampaignsTable;
