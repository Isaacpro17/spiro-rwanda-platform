import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Battery, MapPin, CreditCard, History, TrendingUp, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

export function RiderDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, Rider!</h1>
          <p className="text-gray-600 mt-1">Here's your activity overview</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Battery Level</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">85%</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <Battery className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">RWF 15,000</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Swaps This Month</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">24</p>
                </div>
                <div className="w-12 h-12 bg-accent-500/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-accent-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Plan</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">Premium</p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/rider/stations">
                <Button variant="outline" className="w-full h-24 flex-col space-y-2">
                  <MapPin className="w-6 h-6" />
                  <span>Find Station</span>
                </Button>
              </Link>
              <Link to="/rider/swap-request">
                <Button variant="outline" className="w-full h-24 flex-col space-y-2">
                  <Battery className="w-6 h-6" />
                  <span>Request Swap</span>
                </Button>
              </Link>
              <Link to="/rider/payments">
                <Button variant="outline" className="w-full h-24 flex-col space-y-2">
                  <CreditCard className="w-6 h-6" />
                  <span>Add Funds</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Swaps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Battery className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Kigali Station {item}</p>
                        <p className="text-sm text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-success">Completed</span>
                  </div>
                ))}
              </div>
              <Link to="/rider/swap-history">
                <Button variant="ghost" className="w-full mt-4">
                  View All History
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nearest Stations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Station {item}</p>
                        <p className="text-sm text-gray-500">{item * 0.5} km away</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-success">{15 - item * 2} available</span>
                  </div>
                ))}
              </div>
              <Link to="/rider/stations">
                <Button variant="ghost" className="w-full mt-4">
                  View All Stations
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
