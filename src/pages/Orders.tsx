import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import OrderManagement from '@/components/OrderManagement';
import MyRequests from '@/components/MyRequests';
import { Package, Send } from 'lucide-react';

const Orders = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-temple-red to-temple-red-light bg-clip-text text-transparent">
          Order Center
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Manage incoming requests for your items and track your own borrow requests.
        </p>
      </div>

      <Tabs defaultValue="incoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="incoming" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Incoming Requests
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            My Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-8">
          <OrderManagement />
        </TabsContent>

        <TabsContent value="outgoing" className="mt-8">
          <MyRequests />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Orders;