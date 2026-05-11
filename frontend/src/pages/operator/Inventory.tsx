import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'

export function Inventory() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Battery Inventory</h1>
          <p className="text-gray-600 mt-1">Manage station battery stock</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Battery List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Battery ID</TableHead>
                  <TableHead>Charge Level</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Swap</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((item) => (
                  <TableRow key={item}>
                    <TableCell>BAT-00{item}23</TableCell>
                    <TableCell>{85 + item}%</TableCell>
                    <TableCell>{90 + item}%</TableCell>
                    <TableCell>
                      <Badge variant={item % 2 === 0 ? 'success' : 'warning'}>
                        {item % 2 === 0 ? 'Available' : 'Charging'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item}h ago</TableCell>
                    <TableCell>
                      <button className="text-primary hover:underline text-sm">View</button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
