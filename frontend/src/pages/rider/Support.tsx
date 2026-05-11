import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select } from '../../components/ui/select'

export function Support() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support & Help</h1>
          <p className="text-gray-600 mt-1">Get assistance with your queries</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Support Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select>
                    <option value="">Select category</option>
                    <option value="technical">Technical Issue</option>
                    <option value="billing">Billing</option>
                    <option value="general">General Inquiry</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input placeholder="Brief description" />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea rows={5} placeholder="Describe your issue..." />
                </div>
                <Button type="submit" className="w-full">Submit Ticket</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">Ticket #{item}00{item}</h4>
                      <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full">
                        In Progress
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Battery swap issue at Station {item}</p>
                    <p className="text-xs text-gray-500 mt-2">Created 2 days ago</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
