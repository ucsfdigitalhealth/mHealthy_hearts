import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    id: number;
    username: string;
    email: string;
    created_at: string;
  }