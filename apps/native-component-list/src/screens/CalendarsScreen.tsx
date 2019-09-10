import React from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { NavigationScreenComponent, NavigationScreenProps } from '@react-navigation/core';
import * as Permissions from 'expo-permissions';
import * as Calendar from 'expo-calendar';
import Button from '../components/Button';
import Colors from '../constants/Colors';
import HeadingText from '../components/HeadingText';
import ListButton from '../components/ListButton';
import MonoText from '../components/MonoText';

const CalendarRow: NavigationScreenComponent<
  {},
  {},
  {
    calendar: any;
    updateCalendar: (calendarId: string) => void;
    deleteCalendar: (calendar: any) => void;
  }
> = props => {
  const { calendar } = props;
  const calendarTypeName =
    calendar.entityType === Calendar.EntityTypes.REMINDER ? 'Reminders' : 'Events';
  return (
    <View style={styles.calendarRow}>
      <HeadingText>{calendar.title}</HeadingText>
      <MonoText>{JSON.stringify(calendar, null, 2)}</MonoText>
      <ListButton
        onPress={() => props.navigation.navigate(calendarTypeName, { calendar })}
        title={`View ${calendarTypeName}`}
      />
      <ListButton
        onPress={() => props.updateCalendar(calendar.id)}
        title="Update Calendar"
        disabled={!calendar.allowsModifications}
      />
      <ListButton
        onPress={() => props.deleteCalendar(calendar)}
        title="Delete Calendar"
        disabled={!calendar.allowsModifications}
      />
    </View>
  );
};
CalendarRow.navigationOptions = {
  title: 'Calendars',
};

interface State {
  haveCalendarPermissions: boolean;
  haveReminderPermissions: boolean;
  calendars: any[];
  activeCalendarId?: string;
  activeCalendarEvents: any[];
  showAddNewEventForm: boolean;
  editingEvent?: any;
}

export default class CalendarsScreen extends React.Component<NavigationScreenProps, State> {
  static navigationOptions = {
    title: 'Calendars',
  };

  readonly state: State = {
    haveCalendarPermissions: false,
    haveReminderPermissions: false,
    calendars: [],
    activeCalendarEvents: [],
    showAddNewEventForm: false,
  };

  _askForCalendarPermissions = async () => {
    const response = await Permissions.askAsync(Permissions.CALENDAR);
    const granted = response.status === 'granted';
    this.setState({
      haveCalendarPermissions: granted,
    });
    return granted;
  }

  _askForReminderPermissions = async () => {
    if (Platform.OS === 'android') return true;
    const response = await Permissions.askAsync(Permissions.REMINDERS);
    const granted = response.status === 'granted';
    this.setState({
      haveReminderPermissions: granted,
    });
    return granted;
  }

  _findCalendars = async () => {
    const calendarGranted = await this._askForCalendarPermissions();
    const reminderGranted = await this._askForReminderPermissions();
    if (calendarGranted && reminderGranted) {
      const eventCalendars = (await Calendar.getCalendarsAsync('event')) as unknown as any[];
      const reminderCalendars =
        (Platform.OS === 'ios' ? await Calendar.getCalendarsAsync('reminder') : []) as any[];
      this.setState({ calendars: [...eventCalendars, ...reminderCalendars] });
    }
  }

  _addCalendar = async () => {
    const newCalendar = {
      title: 'cool new calendar',
      entityType: Calendar.EntityTypes.EVENT,
      color: '#c0ff33',
      sourceId:
        Platform.OS === 'ios'
          ? this.state.calendars.find(cal => cal.source && cal.source.name === 'Default').source.id
          : undefined,
      source:
        Platform.OS === 'android'
          ? {
            name: this.state.calendars.find(
                cal => cal.accessLevel === Calendar.CalendarAccessLevel.OWNER
              ).source.name,
            isLocalAccount: true,
          }
          : undefined,
      name: 'coolNewCalendar',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
      ownerAccount:
        Platform.OS === 'android'
          ? this.state.calendars.find(cal => cal.accessLevel === Calendar.CalendarAccessLevel.OWNER)
              .ownerAccount
          : undefined,
    };
    try {
      await Calendar.createCalendarAsync(newCalendar);
      Alert.alert('Calendar saved successfully');
      this._findCalendars();
    } catch (e) {
      Alert.alert('Calendar not saved successfully', e.message);
    }
  }

  _updateCalendar = async (calendarId: string) => {
    const newCalendar = {
      title: 'cool updated calendar',
    };
    try {
      await Calendar.updateCalendarAsync(calendarId, newCalendar);
      Alert.alert('Calendar saved successfully');
      this._findCalendars();
    } catch (e) {
      Alert.alert('Calendar not saved successfully', e.message);
    }
  }

  _deleteCalendar = async (calendar: any) => {
    Alert.alert(`Are you sure you want to delete ${calendar.title}?`, 'This cannot be undone.', [
      {
        text: 'Cancel',
        onPress: () => {},
      },
      {
        text: 'OK',
        onPress: async () => {
          try {
            await Calendar.deleteCalendarAsync(calendar.id);
            Alert.alert('Calendar deleted successfully');
            this._findCalendars();
          } catch (e) {
            Alert.alert('Calendar not deleted successfully', e.message);
          }
        },
      },
    ]);
  }

  render() {
    if (this.state.calendars.length) {
      return (
        <ScrollView style={styles.container}>
          <Button onPress={this._addCalendar} title="Add New Calendar" />
          {this.state.calendars.map(calendar => (
            <CalendarRow
              calendar={calendar}
              key={calendar.id}
              navigation={this.props.navigation}
              updateCalendar={this._updateCalendar}
              deleteCalendar={this._deleteCalendar}
            />
          ))}
        </ScrollView>
      );
    }

    return (
      <View style={styles.container}>
        <Button onPress={this._findCalendars} title="Find my Calendars" />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.greyBackground,
    paddingHorizontal: 10,
    paddingVertical: 16,
    flex: 1,
  },
  calendarRow: {
    marginBottom: 12,
  },
});
