require('./nav-list.css');

import * as React from 'react';
import { Fn } from '../../../common/utils/general/general';
import { classNames } from '../../utils/dom/dom';
import { SvgIcon } from '../svg-icon/svg-icon';
import { Customization } from '../../../common/models/index';

export interface NavLink {
  name: string;
  title: string;
  href?: string;
  newTab?: boolean;
  onClick?: Fn;
}

export interface NavListProps extends React.Props<any> {
  title?: string;
  navLinks: NavLink[];
  iconSvg?: string;
  selected?: string;
  customization?: Customization;
}

export interface NavListState {
}

export class NavList extends React.Component< NavListProps, NavListState> {

  renderIcon(iconSvg: string): any {
    if (!iconSvg) return null;
    return <span className="icon">
      <SvgIcon svg={iconSvg}/>
    </span>;
  }

  renderNavList() {
    const { navLinks, iconSvg, selected } = this.props;
    return navLinks.map((navLink) => {
      return React.createElement(
        navLink.href ? 'a' : 'div',
        {
          className: classNames('item', { selected: selected && selected === navLink.name }),
          key: navLink.name,
          href: navLink.href,
          target: navLink.newTab ? '_blank' : null,
          onClick: navLink.onClick
        },
        this.renderIcon(iconSvg),
        navLink.title
      );
    });
  }

  render() {
    const { title, customization } = this.props;

    var className = "nav-list";
    var titleSection: JSX.Element = null;
    if (title) {
      titleSection = <div className="group-title">{title}</div>;
    } else {
      className += " no-title";
    }
    if (customization && customization.tabsMode) {
      titleSection = null;
      className = 'tabs';
    }

    return <div className={className}>
      {titleSection}
      <div className="items">
        {this.renderNavList()}
      </div>
    </div>;
  };
}
