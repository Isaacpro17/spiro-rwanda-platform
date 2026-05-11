import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { MapPin, Navigation, Battery, Clock } from 'lucide-react'

export function FindStations() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Find Stations</h1>
          <p className="text-gray-600 mt-1">Locate nearby battery swap stations</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Station List */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search Stations</CardTitle>
              </CardHeader>
              <CardContent>
                <Input placeholder="Search by name or location..." className="mb-4" />
                
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((station) => (
                    <div key={station} className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">Kigali Station {station}</h3>
                        <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">Open</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">KG {station} Ave, Kigali</p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Navigation className="w-4 h-4" />
                          <span>{station * 0.5} km</span>
                        </div>
                        <div className="flex items-center space-x-1 text-success">
                          <Battery className="w-4 h-4" />
                          <span>{15 - station} available</span>
                        </div>
                        <div className="flex items-center space-x-1 text-warning">
                          <Clock className="w-4 h-4" />
                          <span>{station * 2} min</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        Get Directions
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-0 h-[600px]">
                <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Map integration will be displayed here</p>
                    <p className="text-sm text-gray-500 mt-2">Showing all stations in your area</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
