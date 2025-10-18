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

const RecentDocumentsTable = ({ data }) => {
  const recentDocsData = data?.recentlyGeneratedDocuments || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently Generated Documents</CardTitle>
        <CardDescription>Latest project briefs from surveys</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentDocsData.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="max-w-[200px] truncate">{doc.title || 'Untitled Brief'}</TableCell>
                <TableCell className="text-muted-foreground">{doc.campaign_name || 'N/A'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(doc.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      doc.status === "Ready for solutioning"
                        ? "bg-green-100 !text-green-900 border-green-200"
                        : doc.status === "Awaiting Review"
                        ? "bg-yellow-100 !text-yellow-800 border-yellow-200"
                        : doc.status === "Sent to Jira"
                        ? "bg-blue-100 !text-blue-800 border-blue-200"
                        : "bg-gray-100 !text-gray-800 border-gray-200"
                    }
                  >
                    {doc.status}
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

export default RecentDocumentsTable;
