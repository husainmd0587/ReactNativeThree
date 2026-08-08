/**
 * ProgramFileManager.jsx
 *
 * A simple file-manager overlay for saved robot programs: list, tap to
 * open, trash icon to delete (with an Alert.alert confirmation, same
 * pattern CanvaProvider already uses for its own confirmations). Uses
 * React Native's built-in Modal - no new dependency.
 *
 * Refetches the list every time it's opened, so it always reflects
 * whatever was most recently saved.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, Alert, StyleSheet } from 'react-native';
import { listSavedPrograms, deleteSavedProgram } from '../core/programStorage';
import { getDialect } from '../engine/dialects';

export function ProgramFileManager({ visible, onClose, onSelect, currentProgramId }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    refresh();
  }, [visible]);

  async function refresh() {
    setLoading(true);
    const list = await listSavedPrograms();
    setPrograms(list);
    setLoading(false);
  }

  function confirmDelete(record) {
    Alert.alert(
      'Delete Program',
      `Delete "${record.name}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSavedProgram(record.id);
            refresh();
          },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Saved Programs</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading && <Text style={styles.emptyText}>Loading…</Text>}

          {!loading && programs.length === 0 && (
            <Text style={styles.emptyText}>No saved programs yet.</Text>
          )}

          <FlatList
            data={programs}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => {
              const isActive = item.id === currentProgramId;
              const dialectLabel = getDialect(item.dialect).label;
              return (
                <TouchableOpacity
                  style={[styles.row, isActive && styles.rowActive]}
                  onPress={() => onSelect(item)}
                >
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowMeta}>
                      {dialectLabel} · {formatDate(item.updatedAt)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.deleteButtonText}>🗑</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#14161b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f3a',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2f3a',
  },
  closeButtonText: {
    color: '#c7cdd6',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 24,
  },
  list: {
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#1c1f26',
  },
  rowActive: {
    borderWidth: 1,
    borderColor: '#e8791a',
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  rowMeta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: {
    fontSize: 16,
  },
});
