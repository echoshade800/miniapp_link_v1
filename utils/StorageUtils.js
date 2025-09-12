import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage utility class
 * Provides AsyncStorage related operations
 */
class StorageUtils {
  static miniAppName = 'Link';

  /**
   * Get user data
   * @returns {Promise<UserData|null>} User data object, returns null if not exists
   */
  static async getUserData() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get local user data:', error);
      return null;
    }
  }

  /**
   * Save user data
   * @param {UserData} userData - User data object
   * @returns {Promise<boolean>} Whether save was successful
   */
  static async saveUserData(userData) {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Failed to save user data:', error);
      return false;
    }
  }

  /**
   * Get info data (global game data)
   * @returns {Promise<any|null>} Info data object, returns null if not exists
   */
  static async getData() {
    try {
      const infoData = await AsyncStorage.getItem(`${this.miniAppName}info`);
      return infoData ? JSON.parse(infoData) : null;
    } catch (error) {
      console.error('Failed to get info data:', error);
      return null;
    }
  }

  /**
   * Set info data (incremental merge)
   * @param {any} newData - New info data object
   * @returns {Promise<boolean>} Whether setting was successful
   */
  static async setData(newData) {
    try {
      const oldData = await this.getData();
      const mergedData = oldData ? { ...oldData, ...newData } : newData;
      await AsyncStorage.setItem(`${this.miniAppName}info`, JSON.stringify(mergedData));
      return true;
    } catch (error) {
      console.error('Failed to set info data:', error);
      return false;
    }
  }
}

export default StorageUtils;