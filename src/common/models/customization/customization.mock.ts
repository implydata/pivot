import { Customization } from '../../../common/models/index';

export class CustomizationMock {
  static pivot() {
    var fakeCustomValue = {
      title: "title",
      headerBackground: '#2799c4',
      tabsMode: false
    };
    return new Customization(fakeCustomValue);
  }
}
