import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const ApiTester: React.FC = () => {
  const [testing, setTesting] = useState(false);

  const testApiConnection = async () => {
    setTesting(true);
    try {
      console.log('Testing API connection to localhost:3000...');
      
      // Test basic connectivity
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'test',
          email: 'test@example.com',
          password: 'test123',
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.text();
      console.log('Response body:', data);

      Alert.alert(
        'API Test Results',
        `Status: ${response.status}\nHeaders: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}\nBody: ${data}`
      );
    } catch (error) {
      console.error('API test error:', error);
      Alert.alert('API Test Failed', `Error: ${error.message}\n\nThis usually means:\n1. Backend server is not running on localhost:3000\n2. CORS is not configured\n3. Network connectivity issues`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Connection Tester</Text>
      <Text style={styles.subtitle}>Use this to debug network issues</Text>
      
      <TouchableOpacity 
        style={[styles.button, testing && styles.buttonDisabled]} 
        onPress={testApiConnection}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test API Connection'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.instructions}>
        Check the console logs for detailed information about the request and response.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  instructions: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default ApiTester;
