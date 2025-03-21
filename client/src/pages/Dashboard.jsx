import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('all');
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch attendance statistics
        let statsUrl = '/api/attendance/stats';
        if (selectedTimeSlot !== 'all') {
          const [startTime, endTime] = selectedTimeSlot.split('-');
          statsUrl += `?startTime=${startTime}&endTime=${endTime}`;
        }
        
        const statsResponse = await api.get(statsUrl);
        setStats(statsResponse.data);
        
        // Extract time slots from statistics
        const slots = new Set();
        statsResponse.data.forEach(stat => {
          if (stat.startTime && stat.endTime) {
            slots.add(`${stat.startTime}-${stat.endTime}`);
          }
        });
        setTimeSlots(Array.from(slots));
        
        // Fetch recent attendance records (today's records)
        const today = new Date().toISOString().split('T')[0];
        let attendanceUrl = `/api/attendance/date/${today}`;
        if (selectedTimeSlot !== 'all') {
          const [startTime, endTime] = selectedTimeSlot.split('-');
          attendanceUrl = `/api/attendance/timeslot?date=${today}&startTime=${startTime}&endTime=${endTime}`;
        }
        
        const attendanceResponse = await api.get(attendanceUrl);
        setRecentAttendance(attendanceResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
    
    // Set up automatic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      let url = `/api/attendance/date/${today}`;
      
      if (selectedTimeSlot !== 'all') {
        const [startTime, endTime] = selectedTimeSlot.split('-');
        url = `/api/attendance/timeslot?date=${today}&startTime=${startTime}&endTime=${endTime}`;
      }
      
      api.get(url)
        .then(response => {
          setRecentAttendance(response.data);
          console.log('Dashboard data refreshed');
        })
        .catch(error => {
          console.error('Error refreshing attendance data:', error);
        });
    }, 30000);
    
    // Clean up on unmount
    return () => clearInterval(refreshInterval);
  }, [refreshKey, selectedTimeSlot]);
  
  // Calculate dashboard summary
  const calculateSummary = () => {
    if (!stats || stats.length === 0) {
      return {
        totalStudents: 0,
        averageAttendance: 0,
        presentToday: 0,
        belowThreshold: 0
      };
    }
    
    // Get unique students
    const uniqueStudents = new Set(stats.map(stat => stat.student));
    
    // Get average attendance across all students
    const averageAttendance = stats.reduce((acc, stat) => acc + stat.presentPercentage, 0) / stats.length;
    
    // Count students with below 75% attendance
    const belowThreshold = stats.filter(stat => stat.presentPercentage < 75).length;
    
    // Count students present today
    const presentToday = recentAttendance.length;
    
    return {
      totalStudents: uniqueStudents.size,
      averageAttendance,
      presentToday,
      belowThreshold
    };
  };
  
  const summary = calculateSummary();
  
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button 
            onClick={() => {
              setIsLoading(true);
              setRefreshKey(prev => prev + 1);
              
              const today = new Date().toISOString().split('T')[0];
              let statsUrl = '/api/attendance/stats';
              let attendanceUrl = `/api/attendance/date/${today}`;
              
              if (selectedTimeSlot !== 'all') {
                const [startTime, endTime] = selectedTimeSlot.split('-');
                statsUrl += `?startTime=${startTime}&endTime=${endTime}`;
                attendanceUrl = `/api/attendance/timeslot?date=${today}&startTime=${startTime}&endTime=${endTime}`;
              }
              
              Promise.all([
                api.get(statsUrl),
                api.get(attendanceUrl)
              ]).then(([statsRes, attendanceRes]) => {
                setStats(statsRes.data);
                setRecentAttendance(attendanceRes.data);
                toast.success('Dashboard refreshed');
              }).catch(error => {
                console.error('Error refreshing data:', error);
                toast.error('Failed to refresh data');
              }).finally(() => {
                setIsLoading(false);
              });
            }}
            className="ml-3 p-2 text-blue-600 hover:bg-blue-50 rounded-full"
            title="Refresh dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <div className="flex space-x-4">
          <div>
            <label htmlFor="time-slot-filter" className="block text-sm font-medium text-gray-700 mr-2">
              Time Slot:
            </label>
            <select
              id="time-slot-filter"
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time Slots</option>
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>
                  {slot.replace('-', ' - ')}
                </option>
              ))}
            </select>
          </div>
          
          <Link
            to="/attendance/capture"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Capture Attendance
          </Link>
          
          <Link
            to="/students/register"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Register Student
          </Link>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Total Students</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalStudents}</p>
              <div className="mt-2">
                <Link to="/students" className="text-blue-600 text-sm">
                  View all students →
                </Link>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Average Attendance</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {summary.averageAttendance.toFixed(1)}%
              </p>
              <div className="mt-2">
                <Link to="/attendance/reports" className="text-blue-600 text-sm">
                  View attendance reports →
                </Link>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Present Today</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.presentToday}</p>
              <div className="mt-2">
                <span className="text-gray-500 text-sm">
                  {new Date().toLocaleDateString()}
                  {selectedTimeSlot !== 'all' && ` (${selectedTimeSlot.replace('-', ' - ')})`}
                </span>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Below 75% Attendance</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">{summary.belowThreshold}</p>
              <div className="mt-2">
                <Link to="/attendance/reports" className="text-blue-600 text-sm">
                  View detailed reports →
                </Link>
              </div>
            </div>
          </div>
          
          {/* Recent Attendance Records */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Today's Attendance</h2>
              {selectedTimeSlot !== 'all' && (
                <p className="text-sm text-gray-500">Time Slot: {selectedTimeSlot.replace('-', ' - ')}</p>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Slot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentAttendance.length > 0 ? (
                    recentAttendance.map((record) => (
                      <tr key={record._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {record.student.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {record.student.registrationNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(record.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {record.startTime && record.endTime 
                              ? `${record.startTime} - ${record.endTime}` 
                              : "Not specified"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.verificationMethod === 'face' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {record.verificationMethod === 'face' ? 'Face Recognition' : 'Manual'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.status === 'present' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status === 'present' ? 'Present' : 'Absent'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                        No attendance records for today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50">
              <Link to="/attendance/capture" className="text-blue-600 hover:text-blue-900">
                Capture new attendance →
              </Link>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/students/register"
                className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100"
              >
                <div className="flex-shrink-0 bg-green-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-green-900">Register Student</h3>
                  <p className="text-sm text-green-600">Add a new student to the system</p>
                </div>
              </Link>
              
              <Link
                to="/attendance/capture"
                className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <div className="flex-shrink-0 bg-blue-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-blue-900">Capture Attendance</h3>
                  <p className="text-sm text-blue-600">Mark attendance using face recognition</p>
                </div>
              </Link>
              
              <Link
                to="/attendance/reports"
                className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100"
              >
                <div className="flex-shrink-0 bg-purple-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-purple-900">View Reports</h3>
                  <p className="text-sm text-purple-600">Generate and view attendance reports</p>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Admin Quick Link - Only if user is admin */}
          {user && user.role === 'admin' && (
            <div className="bg-white rounded-lg shadow p-6">
              <Link
                to="/admin"
                className="flex items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              >
                <div className="flex-shrink-0 bg-indigo-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-indigo-900">Admin Dashboard</h3>
                  <p className="text-sm text-indigo-600">Access advanced management tools</p>
                </div>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;