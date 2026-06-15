import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AcuteSafetyModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
}

const AcuteSafetyModal: React.FC<AcuteSafetyModalProps> = ({ visible, onClose, onContinue }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={styles.modalIconRow}>
          <Ionicons name="warning" size={36} color="#DC2626" />
        </View>
        <Text style={styles.modalTitle}>Important Safety Notice</Text>
        <Text style={styles.modalBody}>
          {'In an emergency, '}
          <Text style={styles.modalLink} onPress={() => Linking.openURL('tel:911')}>
            call 911
          </Text>
          {'. This app does not contact your doctor or send help. Log your symptoms after you are safe.'}
        </Text>
        <TouchableOpacity style={styles.modalButton} onPress={onContinue}>
          <Text style={styles.modalButtonText}>I Understand — Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 14,
  },
  modalBody: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
  },
  modalLink: {
    color: '#DC2626',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default AcuteSafetyModal;
