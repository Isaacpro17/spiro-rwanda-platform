import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'

export function SwapHistory() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Swap History</h1>
          <p className="text-gray-600 mt-1">View your past battery swaps</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Swaps</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Battery Out</TableHead>
                  <TableHead>Battery In</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((item) => (
                  <TableRow key={item}>
                    <TableCell>2026-05-0{item}</TableCell>
                    <TableCell>Kigali Station {item}</TableCell>
                    <TableCell>BAT-00{item}23</TableCell>
                    <TableCell>BAT-00{item}45</TableCell>
                    <TableCell>{item} min</TableCell>
                    <TableCell>RWF 500</TableCell>
                    <TableCell>
                      <Badge variant="success">Completed</Badge>
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
